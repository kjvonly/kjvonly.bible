import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	Modules,
	MODULES_VIEWS,
	PaneSplit,
	type NavigationEntryContext,
	type PaneNavigation
} from '$lib/application';

import {
	NORMALIZED_CONTENT_NAVIGATION_RESULTS,
	NORMALIZED_CONTENT_OVERFLOW_ACTIONS
} from '../../../models/normalized-content-navigation.model';

import {
	handleNormalizedContentOverflowNavigationResult
} from './normalized-content-overflow-navigation-result';

describe('Normalized Content Reader overflow results', () => {
	for (const [action, split] of [
		[NORMALIZED_CONTENT_OVERFLOW_ACTIONS.SPLIT_HORIZONTAL, PaneSplit.HORIZONTAL],
		[NORMALIZED_CONTENT_OVERFLOW_ACTIONS.SPLIT_VERTICAL, PaneSplit.VERTICAL]
	] as const) {
		it(`splits ${action} after returning to the Reader`, () => {
			const navigation = {
				split: vi.fn()
			} as unknown as PaneNavigation;
			let onActive: (() => void | Promise<void>) | undefined;
			const whenActive = vi.fn((callback: () => void | Promise<void>) => {
				onActive = callback;
				return () => {};
			}) as NavigationEntryContext['whenActive'];

			expect(handleNormalizedContentOverflowNavigationResult(
				{
					type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.OVERFLOW_ACTION,
					action
				},
				{ navigation, whenActive, onBrowseDocumentBookmarks: vi.fn(), onOpenDocumentNotes: vi.fn() }
			)).toBe(true);
			expect(navigation.split).not.toHaveBeenCalled();
			expect(whenActive).toHaveBeenCalledOnce();
			onActive?.();
			expect(navigation.split).toHaveBeenCalledTimes(1);
			expect(navigation.split).toHaveBeenCalledWith(
				split,
				Modules.MODULES,
				MODULES_VIEWS.ROOT,
				{}
			);
		});
	}

	it('opens document Browse only after revealing the mounted Reader', () => {
		const navigation = { split: vi.fn() } as unknown as PaneNavigation;
		const onBrowseDocumentBookmarks = vi.fn();
		let onActive: (() => void | Promise<void>) | undefined;
		const whenActive = vi.fn((fn: () => void | Promise<void>) => {
			onActive = fn;
			return () => {};
		}) as NavigationEntryContext['whenActive'];
		expect(handleNormalizedContentOverflowNavigationResult({
			type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.OVERFLOW_ACTION,
			action: NORMALIZED_CONTENT_OVERFLOW_ACTIONS.BROWSE_DOCUMENT_BOOKMARKS
		}, { navigation, whenActive, onBrowseDocumentBookmarks, onOpenDocumentNotes: vi.fn() })).toBe(true);
		expect(onBrowseDocumentBookmarks).not.toHaveBeenCalled();
		onActive?.();
		expect(onBrowseDocumentBookmarks).toHaveBeenCalledOnce();
		expect(navigation.split).not.toHaveBeenCalled();
	});


	it('opens document Notes only after revealing the Reader', () => {
		const navigation = { split: vi.fn() } as unknown as PaneNavigation;
		const onOpenDocumentNotes = vi.fn();
		const onBrowseDocumentBookmarks = vi.fn();
		let onActive: (() => void | Promise<void>) | undefined;
		const whenActive = vi.fn((handler: () => void | Promise<void>) => {
			onActive = handler;
			return () => {};
		}) as NavigationEntryContext['whenActive'];

		expect(handleNormalizedContentOverflowNavigationResult({
			type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.OVERFLOW_ACTION,
			action: NORMALIZED_CONTENT_OVERFLOW_ACTIONS.OPEN_DOCUMENT_NOTES
		}, { navigation, whenActive, onOpenDocumentNotes, onBrowseDocumentBookmarks })).toBe(true);
		expect(onOpenDocumentNotes).not.toHaveBeenCalled();
		onActive?.();
		expect(onOpenDocumentNotes).toHaveBeenCalledOnce();
		expect(onBrowseDocumentBookmarks).not.toHaveBeenCalled();
		expect(navigation.split).not.toHaveBeenCalled();
	});

	it('ignores unrelated or unknown menu results', () => {
		const navigation = { split: vi.fn() } as unknown as PaneNavigation;
		const whenActive = vi.fn() as NavigationEntryContext['whenActive'];
		for (const result of [
			{ type: 'other', action: NORMALIZED_CONTENT_OVERFLOW_ACTIONS.SPLIT_HORIZONTAL },
			{ type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.OVERFLOW_ACTION, action: 'document-notes' },
			{ type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.OVERFLOW_ACTION, action: 'choose-word-note' },
			{ type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.OVERFLOW_ACTION, action: 'unknown' },
			{ type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.OVERFLOW_ACTION },
			'bad-result'
		]) {
			expect(handleNormalizedContentOverflowNavigationResult(result, {
				navigation,
				whenActive,
				onBrowseDocumentBookmarks: vi.fn(), onOpenDocumentNotes: vi.fn()
			})).toBe(false);
		}
		expect(whenActive).not.toHaveBeenCalled();
		expect(navigation.split).not.toHaveBeenCalled();
	});
});
