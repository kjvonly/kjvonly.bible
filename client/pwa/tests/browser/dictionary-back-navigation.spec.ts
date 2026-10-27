import { mount, tick, unmount } from 'svelte';
import { get } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MODULES_VIEWS, PaneSplit } from '$lib/application';
import { Modules } from '$lib/application/models/modules.model';
import { NavigationViewRegistry } from '$lib/application/runtime/rendering/navigation-view-registry';
import { NavigationViewResolver } from '$lib/application/runtime/rendering/navigation-view-resolver';
import { NavigationStateBuilder } from '$lib/application/services/navigation-state-builder';
import { PetNameService } from '$lib/application/services/pet-name.service';
import { PaneNavigationService } from '$lib/application/services/pane-navigation.service';
import { NavigationService, type NavigationComponent } from '$lib/application/services/navigation.service';
import { createDictionaryService, DICTIONARY_VIEWS, type DictionaryEditionManifest, type DictionaryEditionSource } from '$lib/domains/dictionary';
import { DictionaryRuntime } from '$lib/domains/dictionary/ui';
import DictionaryRoot from '$lib/domains/dictionary/modules/dictionary.svelte';
import DictionaryEntry from '$lib/domains/dictionary/modules/dictionaryEntry.svelte';
import DictionaryEditionView from '$lib/domains/dictionary/modules/dictionaryEditionView.svelte';
import DictionaryOverflowActionsView from '$lib/domains/dictionary/modules/dictionaryOverflowActionsView.svelte';
import { DICTIONARY_RESOURCE_TYPE } from '$lib/domains/dictionary';
import { REFS_VIEWS } from '$lib/domains/bible';
import type { DictionarySearchMatch } from '$lib/domains/dictionary';
import DictionaryNavigationTestHost from './fixtures/dictionary-navigation-test-host.svelte';
import PersistentNavigationView from './fixtures/persistent-navigation-view.svelte';

/** Track worker-client lifetimes and requests without relying on internal runtime fields. */
const searchRequests = vi.hoisted(() => ({
	queries: [] as string[],
	createdClients: 0,
	disposedClients: 0
}));

/** Emulate only worker-side prefix matches; the real root, list, and navigation stay mounted. */
vi.mock('$lib/domains/dictionary/workers/search/dictionary-search-worker-client', () => ({
	createBrowserDictionarySearchWorkerClient: () => {
		searchRequests.createdClients++;
		return {
			dispose: () => { searchRequests.disposedClients++; },
			search: async (query: string, source: DictionaryEditionSource) => {
				searchRequests.queries.push(query);
				if (source.resourceId.endsWith('/strongs-kjvs')) {
					return { matches: [
						{ ...source, headword: 'love', key: 'G25' },
						{ ...source, headword: 'love', key: 'H157' }
					] };
				}
				return {
					matches: Array.from({ length: 80 }, (_, index): DictionarySearchMatch => {
						const headwordKey = `${query}${String(index).padStart(3, '0')}`;
						return {
							...source,
							headword: headwordKey,
							key: headwordKey
						};
					})
				};
			}
		};
	}
}));

/** Simulate a worker's normalized response while measuring actual Dictionary view lifetimes. */
const definitionRequests = vi.hoisted(() => ({
	requests: [] as string[],
	createdClients: 0,
	disposedClients: 0
}));

vi.mock('$lib/domains/dictionary/workers/definition/dictionary-definition-worker-client', () => ({
	createBrowserDictionaryDefinitionWorkerClient: () => {
		definitionRequests.createdClients++;
		return {
			dispose: () => { definitionRequests.disposedClients++; },
			getNormalized: async (source: DictionaryEditionSource, headwordKey: string) => {
				definitionRequests.requests.push(JSON.stringify([source.publisher, source.resourceId, headwordKey]));
				return {
					blocks: [{
						type: 'paragraph' as const,
						id: `definition-${headwordKey}`,
						content: [{ type: 'word' as const, text: `Definition for ${headwordKey}` }]
					}]
				};
			}
		};
	}
}));

const sources: readonly DictionaryEditionSource[] = [
	{ publisher: 'dictionary-nav-test', resourceId: 'kjvonly/dictionary/entries/webster-1828' },
	{ publisher: 'dictionary-nav-test', resourceId: 'kjvonly/dictionary/entries/webster-1844' }
];

/** Available picker options are already accepted Dictionary Domain objects. */
function createEdition(source: DictionaryEditionSource): DictionaryEditionManifest {
	return { ...source, id: `${source.publisher}/${source.resourceId}`, edition: source.resourceId.split('/').at(-1)!,
		modifiedAt: 1, entryCount: 80, definitionFormat: 'webster-html', storageFormat: 'chunks-v1', chunkGeneration: 'm1', chunkCount: 1 };
}

let target: HTMLDivElement | undefined;
let mounted: ReturnType<typeof mount> | undefined;

afterEach(async () => {
	if (mounted) await unmount(mounted);
	mounted = undefined;
	target?.remove();
	target = undefined;
});

/** Register the real root with the existing persistent Pane navigation container. */
function createNavigation(paneId = 'dictionary-navigation-test-pane', realEntry = false): PaneNavigationService {
	const registry = new NavigationViewRegistry();
	registry.registerAll([
		{ view: DICTIONARY_VIEWS.ROOT, component: DictionaryRoot as unknown as NavigationComponent },
		{ view: DICTIONARY_VIEWS.ENTRY, component: (realEntry ? DictionaryEntry : PersistentNavigationView) as unknown as NavigationComponent },
		{ view: DICTIONARY_VIEWS.EDITION, component: DictionaryEditionView as unknown as NavigationComponent },
		{ view: DICTIONARY_VIEWS.OVERFLOW_ACTIONS, component: DictionaryOverflowActionsView as unknown as NavigationComponent },
        { view: REFS_VIEWS.ROOT, component: PersistentNavigationView as unknown as NavigationComponent }
	]);
	const selections = {
		independent: () => ({ [DICTIONARY_RESOURCE_TYPE]: sources[0]! }),
		related: (_: Modules, previous: Record<string, DictionaryEditionSource>) => ({ [DICTIONARY_RESOURCE_TYPE]: previous[DICTIONARY_RESOURCE_TYPE] ?? sources[0]! }),
		update: (_: Modules, previous: Record<string, DictionaryEditionSource>, type: string, value: DictionaryEditionSource) => ({ ...previous, [type]: value })
	};
	return new PaneNavigationService(
		paneId,
		new NavigationService(),
		new NavigationStateBuilder(selections),
		new NavigationViewResolver(registry),
		selections
	);
}

/** Find a mounted node or fail with its missing selector. */
function requireElement<T extends Element>(selector: string): T {
	const element = target?.querySelector<T>(selector);
	if (!element) throw new Error(`Missing Dictionary element: ${selector}`);
	return element;
}

describe('Dictionary navigation preservation', () => {
	it.each([
		['pet name', 'Known Publisher', 'Known Publisher'],
		['16-byte pubkey fallback', undefined, '0123456789abcdef0123456789abcdef']
	] as const)('shows %s in the definition attribution', async (_description, petName, expected) => {
		const publisher = '0123456789abcdef'.repeat(4);
		const selected = { publisher, resourceId: sources[0]!.resourceId };
		const petNameService = new PetNameService(
			{ getItem: () => null, setItem: () => undefined },
			petName ? { [publisher]: petName } : {}
		);
		target = document.createElement('div');
		document.body.append(target);
		const navigation = createNavigation('dictionary-publisher-attribution', true);
		navigation.pushModule(Modules.DICTIONARY, DICTIONARY_VIEWS.ENTRY, { ...selected, headwordKey: 'faith' });
		mounted = mount(DictionaryNavigationTestHost, {
			target, props: { navigation, sources: [selected], petNameService }
		});
		await vi.waitFor(() => expect(target?.textContent).toContain(`webster 1828 · ${expected}`));
		if (!petName) expect(target?.textContent).not.toContain(publisher);
	});
	/** A delayed preparation result must never bypass the service's accepted-revision guard. */
	it.each(['ready', 'error'] as const)(
		'keeps the newest imported edition visible after a late %s preparation',
		async lateStatus => {
			const selected = sources[0]!;
			const original = createEdition(selected);
			const imported = { ...original, modifiedAt: 2, entryCount: 81, chunkGeneration: 'archive-m2' };
			let completePreparation!: (result: {
				source: DictionaryEditionSource;
				status: 'ready';
				edition: DictionaryEditionManifest;
			} | { source: DictionaryEditionSource; status: 'error'; error: string }) => void;
			const prepareSource = vi.fn(() => new Promise<
				{ source: DictionaryEditionSource; status: 'ready'; edition: DictionaryEditionManifest } |
				{ source: DictionaryEditionSource; status: 'error'; error: string }
			>(resolve => { completePreparation = resolve; }));
			const dictionaryService = createDictionaryService(new DictionaryRuntime(), {
				prepareSource,
				listInstalledEditions: async () => [imported]
			});
			const prepareThroughService = vi.spyOn(dictionaryService, 'prepareSource');
			target = document.createElement('div');
			document.body.append(target);
			const navigation = createNavigation();
			navigation.pushModule(Modules.DICTIONARY, DICTIONARY_VIEWS.ROOT, {});
			mounted = mount(DictionaryNavigationTestHost, {
				target, props: { navigation, sources, dictionaryService }
			});
			await vi.waitFor(() => expect(prepareSource).toHaveBeenCalledOnce());
			await dictionaryService.refreshImportedEditions();
			await vi.waitFor(() => expect(requireElement<HTMLElement>('header').textContent).toContain('81 definitions'));
			completePreparation(lateStatus === 'ready'
				? { source: selected, status: 'ready', edition: original }
				: { source: selected, status: 'error', error: 'Outdated installation failure' });
			await prepareThroughService.mock.results[0]!.value;
			await tick();
			expect(requireElement<HTMLElement>('header').textContent).toContain('81 definitions');
			expect(target?.textContent).not.toContain('Outdated installation failure');
		}
	);

	/** Direct navigation must prepare the requested Resource, not only the Application defaults. */
	it('waits for the selected edition before reading a directly opened definition', async () => {
		const selected = sources[1]!;
		let completePreparation!: (status: { source: DictionaryEditionSource; status: 'ready'; edition: DictionaryEditionManifest }) => void;
		const prepareSource = vi.fn(() => new Promise<{
			source: DictionaryEditionSource; status: 'ready'; edition: DictionaryEditionManifest
		}>(resolve => { completePreparation = resolve; }));
		const dictionaryService = createDictionaryService(new DictionaryRuntime(), {
			prepareSource,
			listInstalledEditions: async () => []
		});
		target = document.createElement('div');
		document.body.append(target);
		const navigation = createNavigation('dictionary-direct-entry', true);
		navigation.pushModule(Modules.DICTIONARY, DICTIONARY_VIEWS.ENTRY, { ...selected, headwordKey: 'faith' });
		const requestsBefore = definitionRequests.requests.length;
		mounted = mount(DictionaryNavigationTestHost, {
			target, props: { navigation, sources, dictionaryService }
		});

		await vi.waitFor(() => expect(prepareSource).toHaveBeenCalledWith(selected));
		expect(definitionRequests.requests).toHaveLength(requestsBefore);
		completePreparation({ source: selected, status: 'ready', edition: createEdition(selected) });
		await vi.waitFor(() => expect(target?.textContent).toContain('Definition for faith'));
		expect(definitionRequests.requests.at(-1)).toBe(JSON.stringify([
			selected.publisher, selected.resourceId, 'faith'
		]));
	});

	it('shows installation failures and retries before reading a directly opened definition', async () => {
		const selected = sources[1]!;
		const prepareSource = vi.fn()
			.mockResolvedValueOnce({ source: selected, status: 'error', error: 'Edition unavailable' })
			.mockResolvedValueOnce({ source: selected, status: 'ready', edition: createEdition(selected) });
		const dictionaryService = createDictionaryService(new DictionaryRuntime(), {
			prepareSource,
			listInstalledEditions: async () => []
		});
		target = document.createElement('div');
		document.body.append(target);
		const navigation = createNavigation('dictionary-direct-entry-retry', true);
		navigation.pushModule(Modules.DICTIONARY, DICTIONARY_VIEWS.ENTRY, { ...selected, headwordKey: 'faith' });
		const requestsBefore = definitionRequests.requests.length;
		mounted = mount(DictionaryNavigationTestHost, {
			target, props: { navigation, sources, dictionaryService }
		});

		await vi.waitFor(() => expect(target?.textContent).toContain('Edition unavailable'));
		expect(definitionRequests.requests).toHaveLength(requestsBefore);
		const retry = [...(target?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
			.find(button => button.textContent?.trim() === 'Retry');
		expect(retry).toBeDefined();
		retry!.click();
		await vi.waitFor(() => expect(target?.textContent).toContain('Definition for faith'));
		expect(prepareSource).toHaveBeenCalledTimes(2);
		expect(definitionRequests.requests.at(-1)).toBe(JSON.stringify([
			selected.publisher, selected.resourceId, 'faith'
		]));
	});

	it('focuses the headword search input when the root view mounts', async () => {
		target = document.createElement('div');
		document.body.append(target);
		const navigation = createNavigation();
		navigation.pushModule(Modules.DICTIONARY, DICTIONARY_VIEWS.ROOT, {});
		mounted = mount(DictionaryNavigationTestHost, { target, props: { navigation, sources } });

		await vi.waitFor(() => {
			const search = requireElement<HTMLInputElement>('input[type="search"]');
			expect(document.activeElement).toBe(search);
		}, { timeout: 3000 });
	});

	it('toggles the ABC letter strip and shows the total word count below the edition title', async () => {
		target = document.createElement('div');
		document.body.append(target);
		const navigation = createNavigation();
		navigation.pushModule(Modules.DICTIONARY, DICTIONARY_VIEWS.ROOT, {});
		mounted = mount(DictionaryNavigationTestHost, { target, props: { navigation, sources } });
		await vi.waitFor(() => expect(target?.textContent).toContain('80 headwords beginning with A'), { timeout: 3000 });

		const header = requireElement<HTMLElement>('header');
		expect(header.textContent).toContain('Webster 1828');
		expect(header.textContent).toContain('80 definitions');
		const abc = requireElement<HTMLButtonElement>('button[aria-label="Toggle alphabetical browsing"]');
		expect(abc.getAttribute('aria-pressed')).toBe('true');
		expect(abc.querySelector('svg')?.getAttribute('class')).toContain('text-support-a-500');
		expect(requireElement<HTMLElement>('[role="group"][aria-label="Browse headwords by initial letter"]')).toBeTruthy();

		abc.click();
		await vi.waitFor(() => expect(target?.textContent).toContain('Enter a word or turn on ABC to browse headwords.'));
		expect(abc.getAttribute('aria-pressed')).toBe('false');
		expect(abc.querySelector('svg')?.getAttribute('class')).not.toContain('text-support-a-500');
		expect(target?.querySelector('[role="group"][aria-label="Browse headwords by initial letter"]')).toBeNull();

		abc.click();
		await vi.waitFor(() => expect(target?.textContent).toContain('80 headwords beginning with A'));
		expect(abc.getAttribute('aria-pressed')).toBe('true');
		const z = requireElement<HTMLButtonElement>('button[aria-label="Browse Z headwords"]');
		z.click();
		await vi.waitFor(() => expect(target?.textContent).toContain('80 headwords beginning with Z'));
		expect(z.className).toContain('text-support-a-500');
		expect(z.className).toContain('underline');
		expect(get(navigation.views)[0]?.navigationState.state).toMatchObject({
			browseLetter: 'z', showAlphabet: true
		});
		expect(searchRequests.queries.at(-1)).toBe('z');

		abc.click();
		await tick();
		abc.click();
		await vi.waitFor(() => expect(target?.textContent).toContain('80 headwords beginning with A'));
		expect(requireElement<HTMLButtonElement>('button[aria-label="Browse A headwords"]').getAttribute('aria-pressed')).toBe('true');

		const input = requireElement<HTMLInputElement>('input[type="search"]');
		expect(input.getAttribute('aria-label')).toBe('Dictionary headword search');
		expect(input.classList.contains('search-input')).toBe(true);
		expect(input.maxLength).toBe(256);
		expect(target?.textContent).not.toContain('Search headwords');
		const clear = requireElement<HTMLButtonElement>('button[aria-label="Clear search"]');
		expect(clear.disabled).toBe(true);
		input.value = 'word';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await vi.waitFor(() => expect(target?.textContent).toContain('80 matching headwords'));
		expect(clear.disabled).toBe(false);
		expect(abc.getAttribute('aria-pressed')).toBe('false');
		expect(get(navigation.views)[0]?.navigationState.state).toMatchObject({
			query: 'word', browseLetter: 'a', showAlphabet: false
		});
		clear.click();
		await vi.waitFor(() => expect(input.value).toBe(''));
		expect(clear.disabled).toBe(true);
		expect(get(navigation.views)[0]?.navigationState.state).toMatchObject({ query: '', showAlphabet: false });
	});
	it('does not restart or remount the first pane results when another Dictionary pane opens', async () => {
		target = document.createElement('div');
		document.body.append(target);
		const firstNavigation = createNavigation();
		firstNavigation.pushModule(Modules.DICTIONARY, DICTIONARY_VIEWS.ROOT, {});
		const prepareSource = vi.fn(async (source: DictionaryEditionSource) => {
			const edition: DictionaryEditionManifest = {
				id: `${source.publisher}/${source.resourceId}`,
				edition: source.resourceId.split('/').at(-1)!,
				publisher: source.publisher,
				resourceId: source.resourceId,
				modifiedAt: 1,
				entryCount: 80,
				definitionFormat: 'webster-html',
				storageFormat: 'chunks-v1',
				chunkGeneration: 'same-accepted-generation',
				chunkCount: 1
			};
			return { source, status: 'ready' as const, edition };
		});
		const dictionaryService = createDictionaryService(new DictionaryRuntime(), { prepareSource, listInstalledEditions: async () => sources.map(createEdition) });
		mounted = mount(DictionaryNavigationTestHost, {
			target, props: { navigation: firstNavigation, sources, dictionaryService }
		});
		await vi.waitFor(() => expect(target?.textContent).toContain('80 headwords beginning with A'), { timeout: 3000 });
		const viewport = requireElement<HTMLDivElement>('[id$="-scroll-container"].overflow-y-auto');
		await vi.waitFor(() => expect(viewport.querySelectorAll('[data-kjv-scrubber-value]').length).toBe(20));
		const firstRow = requireElement<HTMLElement>('[data-kjv-scrubber-value="1"]');
		const initialRequests = searchRequests.queries.length;

		const secondTarget = document.createElement('div');
		document.body.append(secondTarget);
		let secondMount: ReturnType<typeof mount> | undefined;
		try {
			const secondNavigation = createNavigation('dictionary-navigation-test-pane-2');
			secondNavigation.pushModule(Modules.DICTIONARY, DICTIONARY_VIEWS.ROOT, {});
			secondMount = mount(DictionaryNavigationTestHost, {
				target: secondTarget,
				props: { navigation: secondNavigation, sources, dictionaryService }
			});
			await vi.waitFor(() => expect(secondTarget.textContent).toContain('80 headwords beginning with A'), { timeout: 3000 });
			await new Promise(resolve => setTimeout(resolve, 350));

			expect(target?.textContent).toContain('80 headwords beginning with A');
			expect(viewport.isConnected).toBe(true);
			expect(requireElement<HTMLDivElement>('[id$="-scroll-container"].overflow-y-auto')).toBe(viewport);
			expect(requireElement<HTMLElement>('[data-kjv-scrubber-value="1"]')).toBe(firstRow);
			// Only the newly opened pane should issue a new search.
			expect(searchRequests.queries.length).toBe(initialRequests + 1);
		} finally {
			if (secondMount) await unmount(secondMount);
			secondTarget.remove();
		}
	});

	/** Opening another pane must not transfer worker ownership to that pane. */
	it('shares one search client across panes and recreates it only after the last view closes', async () => {
		const createdBefore = searchRequests.createdClients;
		const disposedBefore = searchRequests.disposedClients;
		const dictionaryService = createDictionaryService(
			new DictionaryRuntime(),
			{
				prepareSource: async (source: DictionaryEditionSource) => ({
					source,
					status: 'ready' as const,
					edition: {
						id: `${source.publisher}/${source.resourceId}`,
						edition: source.resourceId.split('/').at(-1)!,
						publisher: source.publisher,
						resourceId: source.resourceId,
						modifiedAt: 1,
						entryCount: 80,
						definitionFormat: 'webster-html',
						storageFormat: 'chunks-v1' as const,
						chunkGeneration: 'shared-worker-test',
						chunkCount: 1
					}
				}),
				listInstalledEditions: async () => sources.map(createEdition)
			}
		);

		target = document.createElement('div');
		document.body.append(target);
		const firstNavigation = createNavigation('dictionary-lifecycle-pane-1');
		firstNavigation.pushModule(Modules.DICTIONARY, DICTIONARY_VIEWS.ROOT, {});
		mounted = mount(DictionaryNavigationTestHost, {
			target, props: { navigation: firstNavigation, sources, dictionaryService }
		});
		await vi.waitFor(() => expect(target?.textContent).toContain('80 headwords beginning with A'), { timeout: 3000 });
		expect(searchRequests.createdClients).toBe(createdBefore + 1);

		const secondTarget = document.createElement('div');
		document.body.append(secondTarget);
		let secondMount: ReturnType<typeof mount> | undefined;
		try {
			const secondNavigation = createNavigation('dictionary-lifecycle-pane-2');
			secondNavigation.pushModule(Modules.DICTIONARY, DICTIONARY_VIEWS.ROOT, {});
			secondMount = mount(DictionaryNavigationTestHost, {
				target: secondTarget, props: { navigation: secondNavigation, sources, dictionaryService }
			});
			await vi.waitFor(() => expect(secondTarget.textContent).toContain('80 headwords beginning with A'), { timeout: 3000 });
			expect(searchRequests.createdClients).toBe(createdBefore + 1);

			// The shared SearchInput preserves distinct IDs and accessible labels across panes.
			const firstQuery = target!.querySelector<HTMLInputElement>('input[type="search"]')!;
			const secondQuery = secondTarget.querySelector<HTMLInputElement>('input[type="search"]')!;
			expect(firstQuery.id).toMatch(/^dictionary-headword-query-/);
			expect(secondQuery.id).not.toBe(firstQuery.id);
			expect(firstQuery.getAttribute('aria-label')).toBe('Dictionary headword search');
			expect(secondQuery.getAttribute('aria-label')).toBe('Dictionary headword search');
			expect(target!.querySelector('label[for]')).toBeNull();
			expect(secondTarget.querySelector('label[for]')).toBeNull();

			// Closing one pane cannot dispose a client still used by another pane.
			await unmount(mounted!);
			mounted = undefined;
			expect(searchRequests.disposedClients).toBe(disposedBefore);
			const query = secondTarget.querySelector<HTMLInputElement>('input[type="search"]')!;
			query.value = 'faith';
			query.dispatchEvent(new Event('input', { bubbles: true }));
			await vi.waitFor(() => expect(secondTarget.textContent).toContain('80 matching headwords'), { timeout: 3000 });
			expect(searchRequests.queries.at(-1)).toBe('faith');
			expect(searchRequests.createdClients).toBe(createdBefore + 1);

			await unmount(secondMount);
			secondMount = undefined;
			expect(searchRequests.disposedClients).toBe(disposedBefore + 1);

			// Reopening after both panes close creates a new, independent client.
			const reopened = createNavigation('dictionary-lifecycle-reopened');
			reopened.pushModule(Modules.DICTIONARY, DICTIONARY_VIEWS.ROOT, {});
			mounted = mount(DictionaryNavigationTestHost, {
				target, props: { navigation: reopened, sources, dictionaryService }
			});
			await vi.waitFor(() => expect(target?.textContent).toContain('80 headwords beginning with A'), { timeout: 3000 });
			expect(searchRequests.createdClients).toBe(createdBefore + 2);
		} finally {
			if (secondMount) await unmount(secondMount);
			secondTarget.remove();
		}
	});

	/** Exercise the real entry component, not only a placeholder navigation view. */
	it('preserves both panes through definition navigation and releases the shared definition worker at the last close', async () => {
		const createdBefore = definitionRequests.createdClients;
		const disposedBefore = definitionRequests.disposedClients;
		const dictionaryService = createDictionaryService(new DictionaryRuntime(), {
			prepareSource: async (source: DictionaryEditionSource) => ({
				source,
				status: 'ready' as const,
				edition: {
					id: `${source.publisher}/${source.resourceId}`,
					edition: source.resourceId.split('/').at(-1)!,
					publisher: source.publisher,
					resourceId: source.resourceId,
					modifiedAt: 1,
					entryCount: 80,
					definitionFormat: 'webster-html',
					storageFormat: 'chunks-v1' as const,
					chunkGeneration: 'definition-navigation-test',
					chunkCount: 1
				}
			}),
			listInstalledEditions: async () => sources.map(createEdition)
		});
		target = document.createElement('div');
		document.body.append(target);
		const firstNavigation = createNavigation('dictionary-definition-pane-1', true);
		firstNavigation.pushModule(Modules.DICTIONARY, DICTIONARY_VIEWS.ROOT, {});
		mounted = mount(DictionaryNavigationTestHost, {
			target, props: { navigation: firstNavigation, sources, dictionaryService }
		});
		await vi.waitFor(() => expect(target?.textContent).toContain('80 headwords beginning with A'), { timeout: 3000 });
		const firstViewport = requireElement<HTMLDivElement>('[id$="-scroll-container"].overflow-y-auto');
		await vi.waitFor(() => expect(firstViewport.querySelector('[data-kjv-scrubber-value="1"] button')).not.toBeNull());
		firstViewport.querySelector<HTMLButtonElement>('[data-kjv-scrubber-value="1"] button')!.click();
		await vi.waitFor(() => expect(target?.textContent).toContain('Definition for a000'), { timeout: 3000 });
		expect(definitionRequests.createdClients).toBe(createdBefore + 1);
		expect(definitionRequests.requests.at(-1)).toBe(JSON.stringify([sources[0]!.publisher, sources[0]!.resourceId, 'a000']));

		const secondTarget = document.createElement('div');
		document.body.append(secondTarget);
		let secondMount: ReturnType<typeof mount> | undefined;
		try {
			const secondNavigation = createNavigation('dictionary-definition-pane-2', true);
			secondNavigation.pushModule(Modules.DICTIONARY, DICTIONARY_VIEWS.ROOT, {});
			secondMount = mount(DictionaryNavigationTestHost, {
				target: secondTarget, props: { navigation: secondNavigation, sources, dictionaryService }
			});
			await vi.waitFor(() => expect(secondTarget.textContent).toContain('80 headwords beginning with A'), { timeout: 3000 });
			const query = secondTarget.querySelector<HTMLInputElement>('input[type="search"]')!;
			query.value = 'faith';
			query.dispatchEvent(new Event('input', { bubbles: true }));
			await vi.waitFor(() => expect(secondTarget.textContent).toContain('80 matching headwords'), { timeout: 3000 });
			await vi.waitFor(() => expect(secondTarget.querySelector('[data-kjv-scrubber-value="1"] button')).not.toBeNull());
			secondTarget.querySelector<HTMLButtonElement>('[data-kjv-scrubber-value="1"] button')!.click();
			await vi.waitFor(() => expect(secondTarget.textContent).toContain('Definition for faith000'), { timeout: 3000 });
			expect(definitionRequests.createdClients).toBe(createdBefore + 1);
			expect(definitionRequests.requests.at(-1)).toBe(JSON.stringify([sources[0]!.publisher, sources[0]!.resourceId, 'faith000']));

			firstNavigation.back();
			await tick();
			expect(get(firstNavigation.views).at(-1)?.navigationState.view).toBe(DICTIONARY_VIEWS.ROOT);
			expect(firstViewport.closest('.hidden')).toBeNull();
			expect(requireElement<HTMLDivElement>('[id$="-scroll-container"].overflow-y-auto')).toBe(firstViewport);
			expect(target?.textContent).toContain('80 headwords beginning with A');
			expect(secondTarget.textContent).toContain('Definition for faith000');

			await unmount(mounted!);
			mounted = undefined;
			expect(definitionRequests.disposedClients).toBe(disposedBefore);
			secondNavigation.back();
			await tick();
			expect(get(secondNavigation.views).at(-1)?.navigationState.view).toBe(DICTIONARY_VIEWS.ROOT);
			expect(query.isConnected).toBe(true);
			expect(query.value).toBe('faith');
			secondTarget.querySelector<HTMLButtonElement>('[data-kjv-scrubber-value="2"] button')!.click();
			await vi.waitFor(() => expect(secondTarget.textContent).toContain('Definition for faith001'), { timeout: 3000 });
			expect(definitionRequests.createdClients).toBe(createdBefore + 1);
		} finally {
			if (secondMount) await unmount(secondMount);
			secondTarget.remove();
		}
		expect(definitionRequests.disposedClients).toBe(disposedBefore + 1);

		// The next mounted Dictionary session must start a fresh definition client.
		const reopened = createNavigation('dictionary-definition-reopened', true);
		reopened.pushModule(Modules.DICTIONARY, DICTIONARY_VIEWS.ROOT, {});
		mounted = mount(DictionaryNavigationTestHost, {
			target, props: { navigation: reopened, sources, dictionaryService }
		});
		await vi.waitFor(() => expect(target?.querySelector('[data-kjv-scrubber-value="1"] button')).not.toBeNull(), { timeout: 3000 });
		target!.querySelector<HTMLButtonElement>('[data-kjv-scrubber-value="1"] button')!.click();
		await vi.waitFor(() => expect(target?.textContent).toContain('Definition for a000'), { timeout: 3000 });
		expect(definitionRequests.createdClients).toBe(createdBefore + 2);
	});

	it('splits from Dictionary More actions without losing the active search', async () => {
		target = document.createElement('div');
		document.body.append(target);
		const navigation = createNavigation();
		navigation.pushModule(Modules.DICTIONARY, DICTIONARY_VIEWS.ROOT, {});
		const split = vi.spyOn(navigation, 'split').mockImplementation(() => undefined);
		mounted = mount(DictionaryNavigationTestHost, { target, props: { navigation, sources } });
		await vi.waitFor(() => expect(target?.textContent).toContain('80 headwords beginning with A'), { timeout: 3000 });

		const search = requireElement<HTMLInputElement>('input[type="search"]');
		search.value = 'aban';
		search.dispatchEvent(new Event('input', { bubbles: true }));
		await vi.waitFor(() => expect(target?.textContent).toContain('80 matching headwords'));

		for (const [label, direction] of [
			['Split pane horizontally', PaneSplit.HORIZONTAL],
			['Split pane vertically', PaneSplit.VERTICAL]
		] as const) {
			requireElement<HTMLButtonElement>('button[aria-label="More actions. Press and hold to open modules."]').click();
			await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState.view)
				.toBe(DICTIONARY_VIEWS.OVERFLOW_ACTIONS));
			// Shared header actions use visually hidden button text, not aria-label attributes.
			const action = await vi.waitFor(() => {
				const menuHeader = [...(target?.querySelectorAll('header') ?? [])].at(-1);
				const button = [...(menuHeader?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
					.find(button => button.textContent?.trim() === label);
				expect(button).toBeDefined();
				return button!;
			});
			expect(action.querySelector('svg')).toBeTruthy();
			action.click();
			await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState.view)
				.toBe(DICTIONARY_VIEWS.ROOT));
			await vi.waitFor(() => expect(split).toHaveBeenCalledWith(direction, Modules.MODULES, MODULES_VIEWS.ROOT, {}));
			expect(requireElement<HTMLInputElement>('input[type="search"]')).toBe(search);
			expect(search.value).toBe('aban');
			expect(target?.textContent).toContain('80 matching headwords');
		}
		expect(split).toHaveBeenCalledTimes(2);
	});

	it('selects an installed edition through the picker and persists the Resource selection', async () => {
		target = document.createElement('div');
		document.body.append(target);
		const navigation = createNavigation();
		navigation.pushModule(Modules.DICTIONARY, DICTIONARY_VIEWS.ROOT, {});
		mounted = mount(DictionaryNavigationTestHost, { target, props: { navigation, sources } });
		await vi.waitFor(() => expect(target?.textContent).toContain('80 headwords beginning with A'), { timeout: 3000 });
		requireElement<HTMLButtonElement>('button[aria-label="Browse B headwords"]').click();
		const query = requireElement<HTMLInputElement>('input[type="search"]');
		query.value = 'aban';
		query.dispatchEvent(new Event('input', { bubbles: true }));
		await vi.waitFor(() => expect(target?.textContent).toContain('80 matching headwords'), { timeout: 3000 });

		// The selected edition names the header; edition switching lives in More actions.
		expect(requireElement<HTMLElement>('header').textContent).toContain('Webster 1828');
		expect(target!.textContent).not.toContain('Change dictionary');
		requireElement<HTMLButtonElement>('button[aria-label="More actions. Press and hold to open modules."]').click();
		await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState.view)
			.toBe(DICTIONARY_VIEWS.OVERFLOW_ACTIONS));
		const versions = Array.from(target!.querySelectorAll<HTMLButtonElement>('button'))
			.find(button => button.textContent?.trim() === 'Dictionary versions');
		expect(versions).toBeDefined();
		expect(versions!.querySelector('svg path')?.getAttribute('d')).toContain('M160-391');
		versions!.click();
		await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState.view)
			.toBe(DICTIONARY_VIEWS.EDITION));
		await vi.waitFor(() => expect(target?.textContent).toContain('webster 1844'), { timeout: 3000 });
		const pickerButtons = Array.from(target!.querySelectorAll<HTMLButtonElement>('button'));
		const alternative = pickerButtons.find(button => button.textContent?.includes('webster 1844'));
		expect(alternative).toBeDefined();
		alternative!.click();
		await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState.view).toBe(DICTIONARY_VIEWS.ROOT));
		await vi.waitFor(() => expect(target?.textContent).toContain('80 matching headwords'), { timeout: 3000 });
		expect(requireElement<HTMLElement>('header').textContent).toContain('Webster 1844');
		const saved = structuredClone(get(navigation.views)[0]!.navigationState);
		expect(saved.state).toMatchObject({
			query: 'aban', browseLetter: 'b', showAlphabet: false,
			resourceSelections: { [DICTIONARY_RESOURCE_TYPE]: sources[1] }
		});
		expect(saved.state).not.toHaveProperty('excludedSources');
		expect(searchRequests.queries.at(-1)).toBe('aban');

		await unmount(mounted!);
		mounted = undefined;
		const restored = createNavigation();
		restored.hydrate([saved]);
		mounted = mount(DictionaryNavigationTestHost, { target: target!, props: { navigation: restored, sources } });
		await vi.waitFor(() => expect(requireElement<HTMLElement>('header').textContent).toContain('Webster 1844'), { timeout: 3000 });
		expect(requireElement<HTMLInputElement>('input[type="search"]').value).toBe('aban');
		const restoredInput = requireElement<HTMLInputElement>('input[type="search"]');
		restoredInput.value = '';
		restoredInput.dispatchEvent(new Event('input', { bubbles: true }));
		requireElement<HTMLButtonElement>('button[aria-label="Toggle alphabetical browsing"]').click();
		await vi.waitFor(() => expect(target?.textContent).toContain('80 headwords beginning with A'), { timeout: 3000 });
	});

	it("installs and searches the Strong's edition without opening it as Webster HTML", async () => {
		const strongs = { publisher: sources[0]!.publisher, resourceId: 'kjvonly/dictionary/entries/strongs-kjvs' };
		const editions = [...sources, strongs];
		const prepareSource = vi.fn(async (source: DictionaryEditionSource) => ({
			source,
			status: 'ready' as const,
			edition: {
				...createEdition(source),
				definitionFormat: source.resourceId === strongs.resourceId ? 'strongs' : 'webster-html'
			}
		}));
		const dictionaryService = createDictionaryService(new DictionaryRuntime(), {
			prepareSource,
			listInstalledEditions: async () => editions.map(source => ({
				...createEdition(source),
				definitionFormat: source.resourceId === strongs.resourceId ? 'strongs' : 'webster-html'
			}))
		}, editions);
		target = document.createElement('div');
		document.body.append(target);
		const navigation = createNavigation('dictionary-strongs-search');
		navigation.pushModule(Modules.DICTIONARY, DICTIONARY_VIEWS.ROOT, {});
		mounted = mount(DictionaryNavigationTestHost, {
			target, props: { navigation, sources: editions, dictionaryService }
		});
		await vi.waitFor(() => expect(prepareSource).toHaveBeenCalledWith(strongs));
		requireElement<HTMLButtonElement>('button[aria-label="More actions. Press and hold to open modules."]').click();
		await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState.view).toBe(DICTIONARY_VIEWS.OVERFLOW_ACTIONS));
		const versions = [...target!.querySelectorAll<HTMLButtonElement>('button')].find(button =>
			button.textContent?.trim() === 'Dictionary versions');
		versions!.click();
		await vi.waitFor(() => expect(target?.textContent).toContain('strongs kjvs'));
		const choice = [...target!.querySelectorAll<HTMLButtonElement>('button')].find(button =>
			button.textContent?.includes('strongs kjvs'));
		choice!.click();
		await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState.view).toBe(DICTIONARY_VIEWS.ROOT));
		await vi.waitFor(() => expect(requireElement<HTMLElement>('header').textContent).toContain('Strongs kjvs'));
		const search = requireElement<HTMLInputElement>('input[type="search"]');
		search.value = 'love';
		search.dispatchEvent(new Event('input', { bubbles: true }));
		await vi.waitFor(() => expect(target?.textContent).toContain('2 matching headwords'));
		expect(target?.textContent).toContain('G25');
		expect(target?.textContent).toContain('H157');
		const row = requireElement<HTMLButtonElement>('[data-kjv-scrubber-value="1"] button');
		expect(row.disabled).toBe(false);
		row.click();
		await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState.view).toBe(REFS_VIEWS.ROOT));
		expect(get(navigation.views).at(-1)?.navigationState).toMatchObject({
			module: Modules.STRONGS,
			state: {
				refs: ['G25'],
				strongsWords: ['love'],
				resourceSelections: { [DICTIONARY_RESOURCE_TYPE]: strongs }
			}
		});
		navigation.back();
		await vi.waitFor(() => expect(get(navigation.views).at(-1)?.navigationState.view).toBe(DICTIONARY_VIEWS.ROOT));
		expect(get(navigation.views)[0]?.navigationState.state).toMatchObject({
			resourceSelections: { [DICTIONARY_RESOURCE_TYPE]: strongs }
		});
	});

	it('preserves the selected Resource and scroll position when returning from an entry', async () => {
		target = document.createElement('div');
		document.body.append(target);
		const navigation = createNavigation();
		navigation.pushModule(Modules.DICTIONARY, DICTIONARY_VIEWS.ROOT, {});
		mounted = mount(DictionaryNavigationTestHost, { target, props: { navigation, sources } });
		await vi.waitFor(() => expect(target?.textContent).toContain('80 headwords beginning with A'), { timeout: 3000 });
		const viewport = requireElement<HTMLDivElement>('[id$="-scroll-container"].overflow-y-auto');
		await vi.waitFor(() => expect(viewport.querySelectorAll('[data-kjv-scrubber-value]').length).toBe(20));
		viewport.style.height = '150px';
		viewport.style.overflowY = 'auto';
		await vi.waitFor(() => expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight));
		viewport.scrollTop = 120;
		viewport.dispatchEvent(new Event('scroll'));
		const scrollTop = viewport.scrollTop;
		requireElement<HTMLButtonElement>('[data-kjv-scrubber-value="1"] button').click();
		await tick();
		expect(get(navigation.views).at(-1)?.navigationState.state).toMatchObject(sources[0]!);
		navigation.back();
		await tick();
		expect(requireElement<HTMLDivElement>('.overflow-y-auto')).toBe(viewport);
		expect(viewport.scrollTop).toBe(scrollTop);
		expect(get(navigation.views)[0]!.navigationState.state.resourceSelections?.[DICTIONARY_RESOURCE_TYPE]).toEqual(sources[0]);
	});
});
