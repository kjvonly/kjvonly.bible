import { describe, expect, it, vi } from 'vitest';
import type { NormalizedDocument } from '@kjvonly/normalized-content';
import { NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES as OUTCOMES } from '../../../models/normalized-content-navigation.model';
import type { NormalizedContentTextMarkup } from '../../../models/normalized-content-text-markup.model';
import {
	ReaderActionEntry,
	ReaderActionExitReason,
	ReaderActionKind,
	ReaderActionOutcome
} from './reader-action-state';
import {
	TextMarkupRecoveryDecision,
	TextMarkupState,
	type TextMarkupEnvironment,
	type TextMarkupStatePorts
} from './text-markup-state.svelte';

const address = { blockId: 'paragraph', contentIndex: 0 };
const reference = { publisher: 'source', resourceId: 'document', modifiedAt: 1 };
const document = {
	blocks: [{ type: 'paragraph', id: 'paragraph', content: [{ type: 'word', text: 'Word' }] }]
} as NormalizedDocument;

function setup(options: { lookupFailed?: boolean; accepted?: boolean } = {}) {
	let publisher: string | undefined = 'owner';
	let observedPublisher: string | undefined = 'owner';
	let lookupFailed = options.lookupFailed ?? false;
	let accepted: NormalizedContentTextMarkup | undefined = options.accepted === false
		? undefined
		: { id: 'markup', document: reference, markings: {} };
	const openRecovery = vi.fn();
	const showError = vi.fn();
	const create = vi.fn((): NormalizedContentTextMarkup => ({
		id: 'markup', document: reference, markings: {}
	}));
	const markLookupVerified = vi.fn(() => { lookupFailed = false; });
	let state: TextMarkupState;
	const persist = vi.fn(async (markup: NormalizedContentTextMarkup) => {
		accepted = markup;
		state.onAccepted(markup); // the Domain's accepted-object notification
	});
	const ports: TextMarkupStatePorts = {
		read: (): TextMarkupEnvironment => ({
			document, reference, publisher, observedPublisher, accepted,
			lookupLoading: false, lookupFailed
		}),
		openRecovery,
		showError,
		create,
		persist,
		markLookupVerified,
		accept: (markup) => { accepted = markup; }
	};
	state = new TextMarkupState(ports);
	return {
		state, persist, create, openRecovery, showError, markLookupVerified,
		getAccepted: () => accepted,
		setPublisher: (value: string | undefined) => { publisher = value; },
		setObservedPublisher: (value: string | undefined) => { observedPublisher = value; },
		setAccepted: (markup: NormalizedContentTextMarkup | undefined) => { accepted = markup; }
	};
}

function deferred() {
	let resolve!: () => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
	return { promise, resolve, reject };
}

describe('TextMarkupState', () => {
	it('exits synchronously when the accepted draft has no changes', () => {
		const { state, persist } = setup();
		expect(state.enter(ReaderActionEntry.Initial)).toBe(ReaderActionOutcome.Entered);
		expect(state.exit(ReaderActionExitReason.SwitchAction)).toBe(true);
		expect(persist).not.toHaveBeenCalled();
	});

	it('owns click/drag editing and saves a cloned draft on switch before returning to it', async () => {
		const { state, persist, getAccepted } = setup();
		expect(state.enter(ReaderActionEntry.Initial)).toBe(ReaderActionOutcome.Entered);
		state.setSelection({ type: 'bg', colorMarkup: 'bg-highlightb' });
		expect(state.onWordClick(address)).toBe(true);
		expect(getAccepted()?.markings).toEqual({});
		expect(state.markings.paragraph['0'].class).toEqual(['bg-highlightb']);
		state.onDragApply(address);
		state.onDragRemove(address);
		expect(state.markings.paragraph['0'].class).toEqual([]);
		state.onDragApply(address);
		expect(await state.exit(ReaderActionExitReason.SwitchAction)).toBe(true);
		expect(persist).toHaveBeenCalledTimes(1);
		expect(persist.mock.calls[0][0].markings.paragraph['0'].class).toEqual(['bg-highlightb']);
		expect(state.enter(ReaderActionEntry.Resume)).toBe(ReaderActionOutcome.Entered);
		expect(state.selection.colorMarkup).toBe('bg-highlightb');
		expect(state.markings.paragraph['0'].class).toEqual(['bg-highlightb']);
	});

	it('replaces the visible draft when an accepted-object notification arrives', () => {
		const test = setup();
		test.state.enter(ReaderActionEntry.Initial);
		test.state.onWordClick(address);
		const updated = {
			...test.getAccepted()!,
			markings: { paragraph: { '0': { class: ['text-highlightc'] } } }
		};
		test.setAccepted(updated);
		test.state.onAccepted(updated);
		expect(test.state.markings.paragraph['0'].class).toEqual(['text-highlightc']);
	});

	it('does not write unchanged markings or a toggled-and-undone draft', async () => {
		const { state, persist } = setup();
		state.enter(ReaderActionEntry.Initial);
		expect(await state.exit(ReaderActionExitReason.SwitchAction)).toBe(true);
		expect(state.enter(ReaderActionEntry.Resume)).toBe(ReaderActionOutcome.Entered);
		state.onWordClick(address);
		state.onWordClick(address);
		expect(await state.exit(ReaderActionExitReason.SaveAndClose)).toBe(true);
		expect(persist).not.toHaveBeenCalled();
	});

	it('vetoes a failed save and retains the editable draft for retry', async () => {
		const test = setup();
		test.state.enter(ReaderActionEntry.Initial);
		test.state.onWordClick(address);
		test.persist.mockRejectedValueOnce(new Error('storage failed'));
		expect(await test.state.exit(ReaderActionExitReason.SwitchAction)).toBe(false);
		expect(test.showError).toHaveBeenCalledWith('Unable to save Text Markup');
		expect(test.state.markings.paragraph['0'].class).toEqual(['bg-highlighta']);
		expect(await test.state.exit(ReaderActionExitReason.SwitchAction)).toBe(true);
		expect(test.persist).toHaveBeenCalledTimes(2);
	});

	it('cancel discards draft, and context reset neither saves nor retains old state', async () => {
		const { state, persist } = setup();
		state.enter(ReaderActionEntry.Initial);
		state.onWordClick(address);
		expect(await state.exit(ReaderActionExitReason.Cancel)).toBe(true);
		expect(state.markings).toEqual({});
		expect(persist).not.toHaveBeenCalled();
		state.enter(ReaderActionEntry.Initial);
		state.onWordClick(address);
		expect(await state.exit(ReaderActionExitReason.ContextReset)).toBe(true);
		expect(state.markings).toEqual({});
		expect(persist).not.toHaveBeenCalled();
	});

	it('defers unresolved lookup to the existing recovery view and accepts local within the session', async () => {
		const test = setup({ lookupFailed: true });
		expect(test.state.enter(ReaderActionEntry.Initial)).toBe(ReaderActionOutcome.Deferred);
		expect(test.openRecovery).toHaveBeenCalledTimes(1);
		expect(test.state.applyRecoveryResult({
			outcome: OUTCOMES.USE_LOCAL,
			publisher: 'owner',
			markup: test.getAccepted()!
		})).toBe(TextMarkupRecoveryDecision.TextMarkup);
		expect(test.state.enter(ReaderActionEntry.Initial)).toBe(ReaderActionOutcome.Entered);
		expect(await test.state.exit(ReaderActionExitReason.SwitchAction)).toBe(true);
		expect(test.state.enter(ReaderActionEntry.Resume)).toBe(ReaderActionOutcome.Entered);
		expect(test.openRecovery).toHaveBeenCalledTimes(1);
		expect(await test.state.exit(ReaderActionExitReason.SaveAndClose)).toBe(true);
		expect(test.state.enter(ReaderActionEntry.Initial)).toBe(ReaderActionOutcome.Deferred);
		expect(test.openRecovery).toHaveBeenCalledTimes(2);
	});

	it('treats successful Retry as verified; skips markup without creating it', () => {
		const loaded = setup({ lookupFailed: true });
		loaded.state.enter(ReaderActionEntry.Initial);
		expect(loaded.state.applyRecoveryResult({
			outcome: OUTCOMES.LOADED, publisher: 'owner', markup: loaded.getAccepted()!
		})).toBe(TextMarkupRecoveryDecision.TextMarkup);
		expect(loaded.markLookupVerified).toHaveBeenCalledTimes(1);
		expect(loaded.state.enter(ReaderActionEntry.Initial)).toBe(ReaderActionOutcome.Entered);

		const skipped = setup({ lookupFailed: true, accepted: false });
		skipped.state.enter(ReaderActionEntry.Initial);
		expect(skipped.state.applyRecoveryResult({ outcome: OUTCOMES.WITHOUT_MARKUP }))
			.toBe(TextMarkupRecoveryDecision.WithoutMarkup);
		expect(skipped.create).not.toHaveBeenCalled();
		expect(skipped.state.onWordClick(address)).toBe(false);
	});

	it('starts a new in-memory markup object without persisting until the draft changes', async () => {
		const test = setup({ lookupFailed: true, accepted: false });
		expect(test.state.enter(ReaderActionEntry.Initial)).toBe(ReaderActionOutcome.Deferred);
		expect(test.state.applyRecoveryResult({ outcome: OUTCOMES.START_NEW })).toBe(TextMarkupRecoveryDecision.TextMarkup);
		expect(test.create).toHaveBeenCalledTimes(1);
		expect(test.state.enter(ReaderActionEntry.Initial)).toBe(ReaderActionOutcome.Entered);
		expect(await test.state.exit(ReaderActionExitReason.SwitchAction)).toBe(true);
		expect(test.persist).not.toHaveBeenCalled();
	});

	it('ignores mismatched recovery identity and denies an authentication mismatch', () => {
		const test = setup({ lookupFailed: true });
		test.state.enter(ReaderActionEntry.Initial);
		expect(test.state.applyRecoveryResult({
			outcome: OUTCOMES.USE_LOCAL,
			publisher: 'another-owner', markup: test.getAccepted()!
		})).toBe(TextMarkupRecoveryDecision.Ignored);
		expect(test.state.applyRecoveryResult({
			outcome: OUTCOMES.LOADED,
			publisher: 'owner',
			markup: { ...test.getAccepted()!, document: { ...reference, modifiedAt: 2 } }
		})).toBe(TextMarkupRecoveryDecision.Ignored);
		test.setObservedPublisher('different');
		expect(test.state.enter(ReaderActionEntry.Initial)).toBe(ReaderActionOutcome.Rejected);
	});

	it('does not activate an obsolete save after a document/account reset', async () => {
		const test = setup();
		const pending = deferred();
		test.persist.mockImplementationOnce(() => pending.promise);
		test.state.enter(ReaderActionEntry.Initial);
		test.state.onWordClick(address);
		const leaving = test.state.exit(ReaderActionExitReason.SwitchAction);
		expect(test.state.saving).toBe(true);
		expect(await test.state.exit(ReaderActionExitReason.ContextReset)).toBe(true);
		pending.resolve();
		expect(await leaving).toBe(false);
		expect(test.state.markings).toEqual({});
		expect(test.state.saving).toBe(false);
	});

	it('keeps the draft and palette independent between Reader instances', () => {
		const first = setup();
		const second = setup();
		first.state.enter(ReaderActionEntry.Initial);
		second.state.enter(ReaderActionEntry.Initial);
		first.state.onWordClick(address);
		first.state.setSelection({ type: 'text', colorMarkup: 'text-highlightc' });
		expect(second.state.markings).toEqual({});
		expect(second.state.selection.type).toBe('bg');
	});
});

describe('TextMarkupState with the Stage 1 controller', () => {
	it('finishes changed Text Markup before entering a temporary action and resumes it afterward', async () => {
		const { ReaderActionController } = await import('./reader-action-controller.svelte');
		const test = setup();
		expect(test.state.enter(ReaderActionEntry.Initial)).toBe(ReaderActionOutcome.Entered);
		test.state.onWordClick(address);
		const bookmark = {
			kind: ReaderActionKind.AddBookmark,
			enter: vi.fn(() => ReaderActionOutcome.Entered),
			exit: vi.fn(() => true),
			onWordClick: () => true,
			onDragApply: () => {},
			onDragRemove: () => {},
			onLinkActivate: () => true
		};
		const controller = new ReaderActionController(test.state);
		expect(await controller.enterTemporary(bookmark)).toBe(ReaderActionOutcome.Entered);
		expect(test.persist).toHaveBeenCalledTimes(1);
		expect(bookmark.enter).toHaveBeenCalledTimes(1);
		expect(controller.currentState).toBe(bookmark);
		expect(await controller.returnFromTemporary(ReaderActionExitReason.Cancel)).toBe(ReaderActionOutcome.Entered);
		expect(controller.currentState).toBe(test.state);
		expect(test.state.markings.paragraph['0'].class).toEqual(['bg-highlighta']);
	});

	it('does not enter a temporary action when Text Markup exit fails', async () => {
		const { ReaderActionController } = await import('./reader-action-controller.svelte');
		const test = setup();
		test.state.enter(ReaderActionEntry.Initial);
		test.state.onWordClick(address);
		test.persist.mockRejectedValueOnce(new Error('write error'));
		const bookmark = {
			kind: ReaderActionKind.AddBookmark,
			enter: vi.fn(() => ReaderActionOutcome.Entered),
			exit: () => true,
			onWordClick: () => true,
			onDragApply: () => {},
			onDragRemove: () => {},
			onLinkActivate: () => true
		};
		const controller = new ReaderActionController(test.state);
		expect(await controller.enterTemporary(bookmark)).toBe(ReaderActionOutcome.Blocked);
		expect(bookmark.enter).not.toHaveBeenCalled();
		expect(controller.currentState).toBe(test.state);
	});
});
