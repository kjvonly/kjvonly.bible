// This test mounts the view outside +layout.svelte, which normally loads Tailwind.
import '../../src/app.css';

import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import {
	mount,
	tick,
	unmount
} from 'svelte';
import {
	get
} from 'svelte/store';

import {
	ApplicationReferenceResolver,
	Modules,
	ResourceModuleResolver,
	type ApplicationContext
} from '$lib/application';
import {
	FILE_MANAGER_VIEWS
} from '$lib/application/modules/file-manager/models/file-manager-navigation.model';
import FileManagerNavigationEntry from '$lib/application/modules/file-manager/fileManagerNavigationEntry.svelte';
import {
	MockFilesystemRuntime
} from '$lib/application/runtime/dev/mock-filesystem-runtime';
import {
	NavigationViewRegistry
} from '$lib/application/runtime/rendering/navigation-view-registry';
import {
	NavigationViewResolver
} from '$lib/application/runtime/rendering/navigation-view-resolver';
import {
	NavigationStateBuilder
} from '$lib/application/services/navigation-state-builder';
import {
	NavigationService
} from '$lib/application/services/navigation.service';
import {
	PaneNavigationService
} from '$lib/application/services/pane-navigation.service';
import {
	SettingsService
} from '$lib/application/services/settings.service';

import {
	BIBLE_LOCATION_REFERENCE_TYPE,
	BIBLE_VIEWS,
	parseBibleLocationRef
} from '$lib/domains/bible';
import {
	FilesystemService,
	type FilesystemEntry
} from '$lib/domains/filesystem';
import {
	createNormalizedDocumentIdForDescriptor,
	NormalizedContentService,
	NormalizedDocumentValidator,
	NORMALIZED_CONTENT_RESOURCE_TYPE,
	NORMALIZED_CONTENT_VIEWS,
	NORMALIZED_DOCUMENT_DATA_TYPE,
	NORMALIZED_DOCUMENT_DATA_VERSION,
	NORMALIZED_DOCUMENT_OBJECT_TYPE,
	normalizedContentResourceModuleRegistrations
} from '$lib/domains/normalized-content';
import {
	normalizedContentNavigationViewRegistrations
} from '$lib/domains/normalized-content/modules/runtime/normalized-content-navigation-view-registrations';
import {
	IndexedDBNormalizedContentStore
} from '$lib/domains/normalized-content/persistence/indexeddb-normalized-content-store';
import {
	POC_REGRESSION_FIXTURES
} from '$lib/domains/normalized-content/testing/poc-regression.fixtures';

import {
	DOMAIN_OBJECTS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';
import {
	ResourceDescriptorValidator,
	type ResourceDescriptor
} from '$lib/resource';

import FileManagerNormalizedReaderHost from './fixtures/file-manager-normalized-reader-host.svelte';
import BibleReferenceNavigationTarget from './fixtures/bible-reference-navigation-target.svelte';

// Filesystem path deliberately differs from the published Resource identity.
const FILE_PATH = 'library/commentary/matthew-henry/genesis/Genesis-1.nd.json';
const DIRECTORY_PATH = 'library/commentary/matthew-henry/genesis';
const NAME = 'Matthew Henry — Genesis 1';
const entry: FilesystemEntry = {
	path: FILE_PATH,
	descriptor: {
		resourceMetadata: { category: 'commentary', icon: 'article' },
		metadata: {
			publisher: 'f'.repeat(64),
			resourceId: 'normalized-content/matthew-henry/genesis/1',
			name: NAME,
			resourceType: NORMALIZED_CONTENT_RESOURCE_TYPE,
			dataType: NORMALIZED_DOCUMENT_DATA_TYPE,
			dataVersion: NORMALIZED_DOCUMENT_DATA_VERSION,
			modifiedAt: 100,
			representation: 'content',
			mediaType: 'application/json'
		},
		// No loader is registered for this test-only strategy: accepted local
		// state must satisfy the Reader, not a fake production Resource loader.
		strategy: { type: 'fixture-only', data: null }
	}
};

const SECOND_FILE_PATH = 'library/commentary/matthew-henry/genesis/Genesis-2.nd.json';
const secondEntry: FilesystemEntry = {
	path: SECOND_FILE_PATH,
	descriptor: {
		...entry.descriptor,
		metadata: {
			...entry.descriptor.metadata,
			resourceId: 'normalized-content/matthew-henry/genesis/2',
			name: 'Matthew Henry — Genesis 2'
		}
	}
};

let target: HTMLDivElement | undefined;
let component: ReturnType<typeof mount> | undefined;

afterEach(async () => {
	if (component) {
		await unmount(component);
	}
	target?.remove();
	component = undefined;
	target = undefined;

	const db = await getApplicationDB();
	for (const resource of [entry, secondEntry]) {
		await db.delete(
			DOMAIN_OBJECTS,
			createStoredDomainObjectId(
				NORMALIZED_DOCUMENT_OBJECT_TYPE,
				createNormalizedDocumentIdForDescriptor(resource.descriptor)
			)
		);
	}
});

describe('File Manager → Normalized Content Reader', () => {
	for (const viewMode of ['list', 'grid'] as const) {
		it(`opens and reopens an accepted Matthew Henry chapter from ${viewMode} mode`, async () => {
			const runtime = new MockFilesystemRuntime();
			const filesystemService = new FilesystemService(
				{
					listRoots: () => runtime.listRoots(),
					get: async (publisher, rootPath, path) =>
						publisher === 'Demo Library' &&
						rootPath === 'library' &&
						(path === FILE_PATH || path === SECOND_FILE_PATH)
							? (path === FILE_PATH ? entry : secondEntry)
							: runtime.get(publisher, rootPath, path),
					listByRootPath: async (publisher, rootPath) => [
						...await runtime.listByRootPath(publisher, rootPath),
						...(publisher === 'Demo Library' && rootPath === 'library'
							? [entry, secondEntry]
							: [])
					]
				},
				runtime
			);

			const fixture = POC_REGRESSION_FIXTURES[2];
			if (!fixture) throw new Error('Matthew Henry fixture missing');
			const normalizedDocument = new NormalizedDocumentValidator().validate(fixture);
			const store = new IndexedDBNormalizedContentStore(getApplicationDB);
			await store.put(
				createNormalizedDocumentIdForDescriptor(secondEntry.descriptor),
				normalizedDocument
			);
			if (viewMode === 'list') {
				await store.put(
					createNormalizedDocumentIdForDescriptor(entry.descriptor),
					normalizedDocument
				);
			}

			// The grid case exercises a cache miss: the loader must receive a
			// structured-cloneable descriptor, just as a real Resource Worker does.
			const loadDescriptor = vi.fn(async (descriptor: ResourceDescriptor) => {
				structuredClone({ type: 'install-descriptor', descriptor });
				await store.put(
					createNormalizedDocumentIdForDescriptor(descriptor),
					normalizedDocument
				);
			});
			const normalizedContentService = new NormalizedContentService(
				store,
				{ loadDescriptor },
				new ResourceDescriptorValidator()
			);
			const registry = new NavigationViewRegistry();
			registry.registerAll([
				{ view: FILE_MANAGER_VIEWS.BROWSER, component: FileManagerNavigationEntry },
				{ view: BIBLE_VIEWS.READER, component: BibleReferenceNavigationTarget },
				...normalizedContentNavigationViewRegistrations
			]);
			const builder = new NavigationStateBuilder({
				independent: () => ({}),
				related: (_module, selections) => ({ ...selections })
			});
			const navigation = new PaneNavigationService(
				'file-manager-reader-test-pane',
				new NavigationService(),
				builder,
				new NavigationViewResolver(registry),
				{
					independent: () => ({}),
					update: (_module, selections) => ({ ...selections })
				}
			);
			navigation.pushModule(Modules.FILE_MANAGER, FILE_MANAGER_VIEWS.BROWSER, {
				publisher: 'Demo Library',
				rootPath: 'library',
				path: DIRECTORY_PATH,
				viewMode
			});

			const showToast = vi.fn();
			const applicationContext = {
				settingsService: new SettingsService(),
				filesystemService,
				petNameService: { resolve: (publisher: string) => publisher },
				resourceModuleResolver: new ResourceModuleResolver(
					normalizedContentResourceModuleRegistrations
				),
				normalizedContentService,
				authenticationService: {
					subscribe: () => () => {},
					tryGetUserId: () => undefined
				},
				normalizedContentTextMarkupService: {
					unsubscribe: vi.fn()
				},
				applicationReferenceResolver: new ApplicationReferenceResolver([
					{
						referenceType: BIBLE_LOCATION_REFERENCE_TYPE,
						module: Modules.BIBLE,
						view: BIBLE_VIEWS.READER,
						createState: (value) => {
							const bibleLocationRef = parseBibleLocationRef(value);
							return bibleLocationRef === undefined
								? undefined
								: { bibleLocationRef };
						}
					}
				]),
				toastService: { showToast }
			} as unknown as ApplicationContext;

			target = document.createElement('div');
			target.style.width = '280px';
			window.document.body.append(target);
			component = mount(FileManagerNormalizedReaderHost, {
				target,
				props: { applicationContext, navigation, paneWidth: 280 }
			});

			await vi.waitFor(() => {
				expect(target?.textContent).toContain(NAME);
			});
			const breadcrumb = target.querySelector<HTMLElement>(
				'nav[aria-label="Current folder"]'
			);
			expect(breadcrumb).not.toBeNull();
			expect(breadcrumb?.textContent).toContain('Demo Library');
			expect(breadcrumb?.querySelector('[aria-current="page"]')?.textContent)
				.toContain('genesis');
			expect(getComputedStyle(breadcrumb!).display).toBe('flex');
			expect(getComputedStyle(breadcrumb!).flexWrap).toBe('wrap');
			expect(getComputedStyle(breadcrumb!).overflowX).not.toBe('auto');
			expect(breadcrumb!.scrollWidth).toBeLessThanOrEqual(breadcrumb!.clientWidth + 1);
			expect(
				breadcrumb!.querySelector('[aria-current="page"]')!.getBoundingClientRect().top
			).toBeGreaterThan(breadcrumb!.firstElementChild!.getBoundingClientRect().top);

			// The ViewBody owns scrolling. Keep the wrapped breadcrumb at its natural
			// height and pinned to the top while only that existing body scrolls.
			const scrollBody = breadcrumb!.parentElement!;
			expect(getComputedStyle(scrollBody).overflowY).toBe('scroll');
			expect(getComputedStyle(breadcrumb!).position).toBe('sticky');
			expect(getComputedStyle(breadcrumb!).flexShrink).toBe('0');
			expect(getComputedStyle(breadcrumb!).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
			expect(breadcrumb!.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(
				breadcrumb!.lastElementChild!.getBoundingClientRect().bottom
			);
			expect(breadcrumb!.nextElementSibling!.getBoundingClientRect().top).toBeGreaterThanOrEqual(
				breadcrumb!.getBoundingClientRect().bottom - 1
			);

			const spacer = document.createElement('div');
			spacer.style.height = '1600px';
			spacer.style.flexShrink = '0';
			scrollBody.append(spacer);
			scrollBody.scrollTop = 180;
			await tick();
			expect(scrollBody.scrollTop).toBeGreaterThan(0);
			expect(Math.abs(
				breadcrumb!.getBoundingClientRect().top - scrollBody.getBoundingClientRect().top
			)).toBeLessThanOrEqual(1);
			scrollBody.scrollTop = 0;
			spacer.remove();

			const fileButton = () => {
				const buttons = [...(target?.querySelectorAll('button') ?? [])];
				const match = buttons.find(button => button.textContent?.includes(NAME));
				if (!match) throw new Error('Matthew Henry File Manager entry not found');
				return match;
			};
			const originalFolder = fileButton().closest('[role="button"]');

			for (let attempt = 0; attempt < 2; attempt++) {
				fileButton().click();
				await vi.waitFor(() => {
					expect(get(navigation.views).at(-1)?.navigationState).toMatchObject({
						module: Modules.NORMALIZED_CONTENT,
						view: NORMALIZED_CONTENT_VIEWS.READER,
						state: { descriptor: entry.descriptor }
					});
					expect([...target!.querySelectorAll('.whitespace-nowrap')]
						.some((element) => element.textContent?.trim() === 'Genesis-1'))
						.toBe(true);
					expect(get(navigation.views).at(-1)?.navigationState.state)
						.toMatchObject({
							sequenceIndex: 0,
							sequence: [
								{ fileName: 'Genesis-1.nd.json' },
								{ fileName: 'Genesis-2.nd.json' }
							]
						});
					expect(target?.querySelector('#poc-heading-3')?.textContent)
						.toContain('Genesis');
					expect(target?.querySelector('#poc-paragraph-3')?.textContent)
						.toContain('Maker');
				});
				expect(loadDescriptor).toHaveBeenCalledTimes(
					viewMode === 'grid' ? 1 : 0
				);
				expect(showToast).not.toHaveBeenCalled();

				if (attempt === 0) {
					// Follow the real Matthew Henry fixture's Bible reference through
					// the renderer, Reader, typed resolver, and Pane navigation stack.
					const documentRoot = target!.querySelector('#poc-paragraph-3');
					const bibleLink = documentRoot?.querySelector<HTMLAnchorElement>(
						'a[href="bibleLocationReference:22_35_10"]'
					);
					expect(bibleLink).not.toBeNull();
					const documentNode = target!.querySelector('#poc-heading-3');
					bibleLink!.click();
					await vi.waitFor(() => {
						expect(get(navigation.views).at(-1)?.navigationState).toMatchObject({
							module: Modules.BIBLE,
							view: BIBLE_VIEWS.READER,
							state: { bibleLocationRef: '22_35_10' }
						});
						expect(target?.querySelector('[data-testid="bible-reference-destination"]')?.textContent)
							.toContain('22_35_10');
					});
					const bibleBack = target!.querySelector<HTMLButtonElement>(
						'[data-testid="bible-reference-destination"] button'
					);
					bibleBack!.click();
					await vi.waitFor(() => {
						expect(get(navigation.views).at(-1)?.navigationState.view)
							.toBe(NORMALIZED_CONTENT_VIEWS.READER);
						expect(target!.querySelector('#poc-heading-3')).toBe(documentNode);
						expect(get(navigation.views).at(-1)?.navigationState.state.sequenceIndex)
							.toBe(0);
					});
				}

				if (attempt === 0) {
					const more = [...target!.querySelectorAll<HTMLButtonElement>(
						'button[aria-label="More actions. Press and hold to open modules."]'
					)].at(-1);
					expect(more).not.toBeNull();
					more!.click();
					await vi.waitFor(() => {
						expect(get(navigation.views).at(-1)?.navigationState.view)
							.toBe(NORMALIZED_CONTENT_VIEWS.OVERFLOW_ACTIONS);
						const menu = target!.querySelectorAll('header');
						expect(menu.length).toBeGreaterThan(1);
					});
					// Shared HeaderActionButton labels are rendered as sr-only text,
					// not as aria-label attributes on the underlying buttons.
					const menuHeader = [...target!.querySelectorAll('header')].at(-1);
					const findMenuAction = (label: string) =>
						[...(menuHeader?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
							.find((button) => button.textContent?.trim() === label);
					expect(findMenuAction('Split pane horizontally')).toBeDefined();
					expect(findMenuAction('Split pane vertically')).toBeDefined();
					const menuBack = [...target!.querySelectorAll<HTMLButtonElement>(
						'button[aria-label="Back. Press and hold to exit pane."]'
					)].at(-1);
					menuBack?.click();
					await vi.waitFor(() => {
						expect(get(navigation.views).at(-1)?.navigationState.view)
							.toBe(NORMALIZED_CONTENT_VIEWS.READER);
						expect(get(navigation.views).at(-1)?.navigationState.state.sequenceIndex)
							.toBe(0);
					});
				}

				const navigationButton = (label: string) =>
					target!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
				const previous = () => navigationButton('Previous document');
				const next = () => navigationButton('Next document');
				expect(previous()).not.toBeNull();
				expect(next()).not.toBeNull();
				// Navigation is floating, not counted among the header's action slots.
				expect(target!.querySelector('header button[aria-label="Next document"]'))
					.toBeNull();
				const contentRoot = target!.querySelector('#poc-heading-3')!
					.closest<HTMLElement>('.pb-20');
				expect(contentRoot).not.toBeNull();
				expect(parseFloat(getComputedStyle(contentRoot!).paddingBottom)).toBeGreaterThan(48);
				if (attempt === 0) {
					const readerScrollBody = contentRoot!.closest<HTMLElement>('[id$="-scroll-container"]')!;
					expect(getComputedStyle(readerScrollBody).overflowY).toBe('scroll');
					// Make the document long, not the scroll container short.
					contentRoot!.style.minHeight = '2400px';
					const middle = Math.floor(
						(readerScrollBody.scrollHeight - readerScrollBody.clientHeight) / 2
					);
					readerScrollBody.scrollTop = middle;
					readerScrollBody.dispatchEvent(new Event('scroll'));
					await vi.waitFor(() => expect(previous()).toBeNull());
					// Upward movement reveals controls without reaching the top or bottom.
					readerScrollBody.scrollTop = middle - 40;
					readerScrollBody.dispatchEvent(new Event('scroll'));
					await vi.waitFor(() => expect(previous()).not.toBeNull());
					// Tiny reverse movements do not immediately hide the controls.
					readerScrollBody.scrollTop = middle - 38;
					readerScrollBody.dispatchEvent(new Event('scroll'));
					expect(previous()).not.toBeNull();
					// Downward movement hides them again in the middle.
					readerScrollBody.scrollTop = middle + 40;
					readerScrollBody.dispatchEvent(new Event('scroll'));
					await vi.waitFor(() => expect(previous()).toBeNull());
					readerScrollBody.scrollTop = readerScrollBody.scrollHeight - readerScrollBody.clientHeight;
					readerScrollBody.dispatchEvent(new Event('scroll'));
					await vi.waitFor(() => expect(previous()).not.toBeNull());
					readerScrollBody.scrollTop = 0;
					readerScrollBody.dispatchEvent(new Event('scroll'));
					contentRoot!.style.minHeight = '';
				}
				expect(previous()?.disabled).toBe(true);
				expect(next()?.disabled).toBe(false);
				next()?.click();
				await vi.waitFor(() => {
					expect(get(navigation.views).at(-1)?.navigationState.state.sequenceIndex)
						.toBe(1);
					expect([...target!.querySelectorAll('.whitespace-nowrap')]
						.some((element) => element.textContent?.trim() === 'Genesis-2'))
						.toBe(true);
					expect(target?.querySelector('#poc-heading-3')?.textContent)
						.toContain('Genesis');
				});
				expect(next()?.disabled).toBe(true);
				expect(previous()?.disabled).toBe(false);
				previous()?.click();
				await vi.waitFor(() => {
					expect(get(navigation.views).at(-1)?.navigationState.state.sequenceIndex)
						.toBe(0);
					expect([...target!.querySelectorAll('.whitespace-nowrap')]
						.some((element) => element.textContent?.trim() === 'Genesis-1'))
						.toBe(true);
				});

				const back = [...(target?.querySelectorAll<HTMLButtonElement>(
					'button[aria-label="Back. Press and hold to exit pane."]'
				) ?? [])].at(-1);
				expect(back).toBeDefined();
				back?.click();
				await tick();
				expect(get(navigation.views).at(-1)?.navigationState.view)
					.toBe(FILE_MANAGER_VIEWS.BROWSER);
				expect(fileButton().closest('[role="button"]')).toBe(originalFolder);
			}
		});
	}
});
