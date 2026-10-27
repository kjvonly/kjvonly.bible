import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, tick, unmount } from 'svelte';

import { Modules, type ApplicationContext, type NavigationState, type PaneNavigation } from '$lib/application';
import {
	NORMALIZED_CONTENT_NAVIGATION_RESULTS,
	NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES,
	NORMALIZED_CONTENT_VIEWS
} from '$lib/domains/normalized-content/models/normalized-content-navigation.model';
import type { NormalizedContentTextMarkup } from '$lib/domains/normalized-content';
import NormalizedContentTextMarkupLookupHost from './fixtures/normalized-content-text-markup-lookup-host.svelte';

let root: HTMLDivElement | undefined;
let component: ReturnType<typeof mount> | undefined;
const descriptor = {
	metadata: { publisher: 'document-publisher', resourceId: 'document-resource', modifiedAt: 42 }
};
const markup: NormalizedContentTextMarkup = {
	id: 'markup-a', document: { publisher: 'document-publisher', resourceId: 'document-resource', modifiedAt: 42 }, markings: {}
};

afterEach(async () => {
	if (component) await unmount(component);
	root?.remove();
	root = undefined;
	component = undefined;
});

function mountLookup(
	get: (publisher: string, descriptor: unknown) => Promise<NormalizedContentTextMarkup>,
	getLocal: (publisher: string, descriptor: unknown) => Promise<NormalizedContentTextMarkup | undefined> = async () => undefined
) {
	const backWithResult = vi.fn(async () => {});
	const getMarkup = vi.fn(get);
	const getLocalMarkup = vi.fn(getLocal);
	const navigation = { back: vi.fn(), backWithResult } as unknown as PaneNavigation;
	const applicationContext = {
		authenticationService: { tryGetUserId: () => 'user-a' },
		normalizedContentTextMarkupService: { get: getMarkup, getLocal: getLocalMarkup }
	} as unknown as ApplicationContext;
	const navigationState = {
		module: Modules.NORMALIZED_CONTENT,
		view: NORMALIZED_CONTENT_VIEWS.TEXT_MARKUP_LOOKUP,
		state: { descriptor }
	} as unknown as NavigationState;
	root = document.createElement('div');
	document.body.append(root);
	component = mount(NormalizedContentTextMarkupLookupHost, {
		target: root, props: { navigation, applicationContext, navigationState }
	});
	return { backWithResult, getMarkup, getLocalMarkup };
}

function clickOption(label: string): void {
	const button = [...(root?.querySelectorAll('button') ?? [])].find(
		(button) => button.textContent?.trim() === label
	);
	if (!button) throw new Error(`Missing action ${label}`);
	button.click();
}

async function flush(): Promise<void> {
	await tick();
	await Promise.resolve();
	await tick();
}

function deferred<T>() {
	let resolve: (value: T) => void = () => {};
	let reject: (reason?: unknown) => void = () => {};
	const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
	return { promise, resolve, reject };
}

describe('Text Markup lookup navigation view', () => {
	for (const [label, outcome] of [
		['Continue with new Text Markup', NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.START_NEW],
		['Continue without Text Markup', NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.WITHOUT_MARKUP]
	] as const) {
		it(`returns ${outcome} without starting a lookup`, async () => {
			const { backWithResult, getMarkup } = mountLookup(async () => markup);
			await flush();
			clickOption(label);
			await flush();
			expect(backWithResult).toHaveBeenCalledWith({
				type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.TEXT_MARKUP_LOOKUP, outcome
			});
			expect(getMarkup).not.toHaveBeenCalled();
		});
	}

	it('offers the saved local copy instead of creating a new draft', async () => {
		const { backWithResult, getMarkup, getLocalMarkup } = mountLookup(
			async () => { throw new Error('Relay unavailable'); },
			async () => markup
		);
		await flush();
		expect(root?.textContent).toContain('Continue with local Text Markup');
		expect(root?.textContent).not.toContain('Continue with new Text Markup');
		clickOption('Continue with local Text Markup');
		await flush();
		expect(getLocalMarkup).toHaveBeenCalledWith('user-a', descriptor);
		expect(getMarkup).not.toHaveBeenCalled();
		expect(backWithResult).toHaveBeenCalledWith({
			type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.TEXT_MARKUP_LOOKUP,
			outcome: NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.USE_LOCAL,
			publisher: 'user-a', markup
		});
	});

	it('does not offer a fresh draft when local storage cannot be checked', async () => {
		mountLookup(async () => markup, async () => { throw new Error('IndexedDB unavailable'); });
		await flush();
		expect(root?.textContent).toContain('Unable to check local storage');
		expect(root?.textContent).not.toContain('Continue with new Text Markup');
		expect(root?.textContent).toContain('Continue without Text Markup');
	});

	it('keeps the view open with progress while retrying and returns the accepted lookup once', async () => {
		const pending = deferred<NormalizedContentTextMarkup>();
		const { backWithResult, getMarkup } = mountLookup(async () => pending.promise);
		await flush();
		clickOption('Retry lookup');
		await flush();
		expect(root?.textContent).toContain('Retrying Text Markup lookup');
		expect(root?.querySelector('[role="status"]')).not.toBeNull();
		expect(backWithResult).not.toHaveBeenCalled();
		expect([...root!.querySelectorAll<HTMLButtonElement>('ul button')].every((button) => button.disabled)).toBe(true);
		expect(getMarkup).toHaveBeenCalledWith('user-a', descriptor);
		pending.resolve(markup);
		await flush();
		expect(backWithResult).toHaveBeenCalledTimes(1);
		expect(backWithResult).toHaveBeenCalledWith({
			type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.TEXT_MARKUP_LOOKUP,
			outcome: NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.LOADED,
			publisher: 'user-a', markup
		});
		expect(getMarkup).toHaveBeenCalledTimes(1);
	});

	it('stays on the same view with an explanation after failure and allows another retry', async () => {
		let tries = 0;
		const { backWithResult, getMarkup } = mountLookup(async () => {
			if (++tries === 1) throw new Error('Relay offline');
			return markup;
		});
		await flush();
		clickOption('Retry lookup');
		await flush();
		expect(root?.textContent).toContain('Still unable to retrieve Text Markup');
		expect(backWithResult).not.toHaveBeenCalled();
		expect([...root!.querySelectorAll<HTMLButtonElement>('ul button')].every((button) => !button.disabled)).toBe(true);
		clickOption('Retry lookup');
		await flush();
		expect(root?.textContent).not.toContain('Still unable to retrieve Text Markup');
		expect(getMarkup).toHaveBeenCalledTimes(2);
		expect(backWithResult).toHaveBeenCalledTimes(1);
	});
});
