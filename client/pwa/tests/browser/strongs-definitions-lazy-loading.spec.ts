import { mount, tick, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Strongs } from '$lib/domains/strongs';
import StrongsDefinitionsLazyHost from './fixtures/strongs-definitions-lazy-host.svelte';

let target: HTMLDivElement | undefined;
let mounted: ReturnType<typeof mount> | undefined;

function makeDefinition(key: string): Strongs {
	return {
		id: `test-publisher/kjvs/${key}`,
		number: key,
		originalWord: 'word',
		partsOfSpeech: 'Noun',
		phoneticSpelling: 'word',
		transliteratedWord: 'word',
		usageByBook: [],
		usageByWord: [],
		brownDef: null,
		strongsDef: `<p>Definition of ${key}</p>`,
		thayersDef: null
	};
}

function buttons(): HTMLButtonElement[] {
	return Array.from(target!.querySelectorAll('button'));
}

async function render(strongsRefs: string[], collapseDefinitions: boolean = false) {
	target = document.createElement('div');
	document.body.append(target);
	const getDefinition = vi.fn(async (_source: unknown, key: string) => makeDefinition(key));
	mounted = mount(StrongsDefinitionsLazyHost, {
		target,
		props: {
			getDefinition,
			strongsRefs,
			strongsWords: strongsRefs.map(key => `word-${key}`),
			collapseDefinitions
		}
	});
	await tick();
	return getDefinition;
}

afterEach(async () => {
	if (mounted) await unmount(mounted);
	target?.remove();
	mounted = undefined;
	target = undefined;
});

describe("Strong's definition loading", () => {
	it('does not load a verse group until individual words are expanded and caches opened definitions', async () => {
		const getDefinition = await render(['G26', 'H157', 'G25']);
		expect(getDefinition).not.toHaveBeenCalled();
		expect(target!.textContent).toContain('G26:');
		expect(target!.textContent).toContain('H157:');
		expect(target!.textContent).not.toContain('Definition of');

		buttons()[1].click();
		await vi.waitFor(() => expect(target!.textContent).toContain('Definition of H157'));
		expect(getDefinition).toHaveBeenCalledTimes(1);
		expect(getDefinition).toHaveBeenCalledWith(
			{ publisher: 'test-publisher', resourceId: 'kjvonly/dictionary/entries/strongs-kjvs' },
			'H157'
		);

		buttons()[1].click();
		await tick();
		expect(target!.textContent).not.toContain('Definition of H157');
		buttons()[1].click();
		await tick();
		expect(target!.textContent).toContain('Definition of H157');
		expect(getDefinition).toHaveBeenCalledTimes(1);

		buttons()[0].click();
		await vi.waitFor(() => expect(target!.textContent).toContain('Definition of G26'));
		expect(getDefinition).toHaveBeenCalledTimes(2);
	});

	it('shares an already requested definition between repeated references in the verse', async () => {
		const getDefinition = await render(['G26', 'G26']);
		buttons()[0].click();
		await vi.waitFor(() => expect(target!.textContent).toContain('Definition of G26'));
		buttons()[1].click();
		await vi.waitFor(() => {
			expect(target!.textContent?.match(/Definition of G26/g)).toHaveLength(2);
		});
		expect(getDefinition).toHaveBeenCalledTimes(1);
	});

	it('opening a collapsed section reveals rows but does not retrieve a multi-definition group', async () => {
		const getDefinition = await render(['G26', 'H157'], true);
		expect(getDefinition).not.toHaveBeenCalled();
		expect(target!.textContent).not.toContain('G26:');

		buttons()[0].click();
		await tick();
		expect(target!.textContent).toContain('G26:');
		expect(getDefinition).not.toHaveBeenCalled();

		buttons()[1].click();
		await vi.waitFor(() => expect(target!.textContent).toContain('Definition of G26'));
		expect(getDefinition).toHaveBeenCalledTimes(1);
	});

	it('allows retrying a missing definition without affecting other rows', async () => {
		const getDefinition = await render(['G27', 'G26']);
		getDefinition.mockRejectedValueOnce(new Error('Definition not installed'));
		buttons()[0].click();
		await vi.waitFor(() => expect(target!.textContent).toContain('Definition not installed'));
		expect(getDefinition).toHaveBeenCalledTimes(1);

		buttons()[0].click();
		await tick();
		buttons()[0].click();
		await vi.waitFor(() => expect(target!.textContent).toContain('Definition of G27'));
		expect(getDefinition).toHaveBeenCalledTimes(2);
	});

	it('loads a single already-visible definition and delays one behind a collapsed section', async () => {
		const getDefinition = await render(['G26']);
		await vi.waitFor(() => expect(target!.textContent).toContain('Definition of G26'));
		expect(getDefinition).toHaveBeenCalledTimes(1);

		await unmount(mounted!);
		target!.replaceChildren();
		mounted = undefined;

		const getCollapsed = vi.fn(async (_source: unknown, key: string) => makeDefinition(key));
		mounted = mount(StrongsDefinitionsLazyHost, {
			target: target!,
			props: { getDefinition: getCollapsed, strongsRefs: ['H157'], collapseDefinitions: true }
		});
		await tick();
		expect(getCollapsed).not.toHaveBeenCalled();
		buttons()[0].click();
		await vi.waitFor(() => expect(target!.textContent).toContain('Definition of H157'));
		expect(getCollapsed).toHaveBeenCalledTimes(1);
	});
});
