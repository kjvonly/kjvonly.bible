import { describe, expect, it, vi } from 'vitest';
import { ReaderActionController } from './reader-action-controller.svelte';
import {
	ReaderActionEntry,
	ReaderActionExitReason,
	ReaderActionKind,
	ReaderActionOutcome,
	type ReaderActionEntryResult,
	type ReaderActionState
} from './reader-action-state';

function state(
	kind: ReaderActionKind,
	options: {
		enter?: (entry: ReaderActionEntry) => ReaderActionEntryResult | Promise<ReaderActionEntryResult>;
		exit?: (reason: ReaderActionExitReason) => boolean | Promise<boolean>;
	} = {}
) {
	return {
		kind,
		enter: vi.fn(options.enter ?? (() => ReaderActionOutcome.Entered)),
		exit: vi.fn(options.exit ?? (() => true)),
		onWordClick: vi.fn(() => false),
		onDragApply: vi.fn(),
		onDragRemove: vi.fn(),
		onLinkActivate: vi.fn(() => false)
	} satisfies ReaderActionState;
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((settle) => { resolve = settle; });
	return { promise, resolve };
}

describe('ReaderActionController', () => {
	it('enters synchronous states immediately without deferring the UI to another microtask', async () => {
		const reading = state(ReaderActionKind.Reading);
		const markup = state(ReaderActionKind.TextMarkup);
		const controller = new ReaderActionController(reading);

		const transition = controller.switchTo(markup);
		expect(reading.exit).toHaveBeenCalledWith(ReaderActionExitReason.SwitchAction);
		expect(markup.enter).toHaveBeenCalledWith(ReaderActionEntry.Initial);
		expect(controller.currentState).toBe(markup);
		expect(await transition).toBe(ReaderActionOutcome.Entered);
	});

	it('releases a deferred entry before the recovery result can request a new transition', async () => {
		const reading = state(ReaderActionKind.Reading);
		const markup = state(ReaderActionKind.TextMarkup, {
			enter: () => ReaderActionOutcome.Deferred
		});
		const withoutMarkup = state(ReaderActionKind.WithoutMarkup);
		const controller = new ReaderActionController(reading);

		// Navigation may deliver a result in the same event turn as Edit.
		const deferredEntry = controller.switchTo(markup);
		expect(controller.currentState).toBe(reading);
		expect(controller.transitioning).toBe(false);
		expect(await controller.switchTo(withoutMarkup)).toBe(ReaderActionOutcome.Entered);
		expect(await deferredEntry).toBe(ReaderActionOutcome.Deferred);
		expect(controller.currentState).toBe(withoutMarkup);
	});

	it('awaits exit before entering and publishing the next state', async () => {
		const order: string[] = [];
		const save = deferred<boolean>();
		const reading = state(ReaderActionKind.Reading, {
			exit: () => { order.push('exit'); return save.promise; }
		});
		const markup = state(ReaderActionKind.TextMarkup, {
			enter: (entry) => { order.push(`enter:${entry}`); return ReaderActionOutcome.Entered; }
		});
		const controller = new ReaderActionController(reading);

		const pending = controller.switchTo(markup);
		expect(controller.currentState).toBe(reading);
		expect(controller.transitioning).toBe(true);
		expect(markup.enter).not.toHaveBeenCalled();
		save.resolve(true);
		expect(await pending).toBe(ReaderActionOutcome.Entered);
		expect(order).toEqual(['exit', `enter:${ReaderActionEntry.Initial}`]);
		expect(controller.currentState).toBe(markup);
		expect(controller.transitioning).toBe(false);
	});

	it('vetoes a switch without calling the destination when saving fails', async () => {
		const markup = state(ReaderActionKind.TextMarkup, { exit: () => false });
		const bookmark = state(ReaderActionKind.AddBookmark);
		const controller = new ReaderActionController(markup);

		expect(await controller.enterTemporary(bookmark)).toBe(ReaderActionOutcome.Blocked);
		expect(controller.currentState).toBe(markup);
		expect(bookmark.enter).not.toHaveBeenCalled();
		expect(await controller.returnFromTemporary(ReaderActionExitReason.Cancel)).toBe(ReaderActionOutcome.Blocked);
	});

	it('blocks duplicate transitions while an exit is in progress', async () => {
		const save = deferred<boolean>();
		const markup = state(ReaderActionKind.TextMarkup, { exit: () => save.promise });
		const bookmark = state(ReaderActionKind.AddBookmark);
		const note = state(ReaderActionKind.AddNote);
		const controller = new ReaderActionController(markup);

		const first = controller.enterTemporary(bookmark);
		expect(await controller.enterTemporary(note)).toBe(ReaderActionOutcome.Blocked);
		expect(await controller.switchTo(note)).toBe(ReaderActionOutcome.Blocked);
		save.resolve(true);
		expect(await first).toBe(ReaderActionOutcome.Entered);
		expect(note.enter).not.toHaveBeenCalled();
	});

	it.each([ReaderActionKind.TextMarkup, ReaderActionKind.WithoutMarkup] as const)(
		'returns from a temporary action to the captured %s state',
		async (kind) => {
			const origin = state(kind);
			const bookmark = state(ReaderActionKind.AddBookmark);
			const controller = new ReaderActionController(origin);

			expect(await controller.enterTemporary(bookmark)).toBe(ReaderActionOutcome.Entered);
			expect(controller.currentState).toBe(bookmark);
			expect(await controller.returnFromTemporary(ReaderActionExitReason.ActionComplete)).toBe(ReaderActionOutcome.Entered);
			expect(bookmark.exit).toHaveBeenCalledWith(ReaderActionExitReason.ActionComplete);
			expect(origin.enter).toHaveBeenCalledWith(ReaderActionEntry.Resume);
			expect(controller.currentState).toBe(origin);
			expect(await controller.returnFromTemporary(ReaderActionExitReason.Cancel)).toBe(ReaderActionOutcome.Blocked);
		}
	);

	it('passes cancellation to the temporary state before resuming the origin', async () => {
		const origin = state(ReaderActionKind.TextMarkup);
		const note = state(ReaderActionKind.AddNote);
		const controller = new ReaderActionController(origin);
		await controller.enterTemporary(note);

		expect(await controller.returnFromTemporary(ReaderActionExitReason.Cancel)).toBe(ReaderActionOutcome.Entered);
		expect(note.exit).toHaveBeenCalledWith(ReaderActionExitReason.Cancel);
		expect(origin.enter).toHaveBeenCalledWith(ReaderActionEntry.Resume);
	});

	it('retains the temporary action and return target if its exit is vetoed', async () => {
		const origin = state(ReaderActionKind.TextMarkup);
		let allowExit = false;
		const bookmark = state(ReaderActionKind.AddBookmark, { exit: () => allowExit });
		const controller = new ReaderActionController(origin);
		await controller.enterTemporary(bookmark);

		expect(await controller.returnFromTemporary(ReaderActionExitReason.Cancel)).toBe(ReaderActionOutcome.Blocked);
		expect(controller.currentState).toBe(bookmark);
		allowExit = true;
		expect(await controller.returnFromTemporary(ReaderActionExitReason.Cancel)).toBe(ReaderActionOutcome.Entered);
		expect(controller.currentState).toBe(origin);
	});

	it.each([ReaderActionOutcome.Deferred, ReaderActionOutcome.Rejected] as const)(
		'keeps the old state active and resumes it when entry is %s',
		async (result) => {
			const reading = state(ReaderActionKind.Reading);
			const markup = state(ReaderActionKind.TextMarkup, { enter: () => result });
			const controller = new ReaderActionController(reading);
			expect(await controller.enterTemporary(markup)).toBe(result);
			expect(controller.currentState).toBe(reading);
			expect(reading.enter).toHaveBeenCalledWith(ReaderActionEntry.Resume);
			expect(await controller.returnFromTemporary(ReaderActionExitReason.Cancel)).toBe(ReaderActionOutcome.Blocked);
		}
	);

	it('keeps the previous state active if destination entry throws', async () => {
		const reading = state(ReaderActionKind.Reading);
		const markup = state(ReaderActionKind.TextMarkup, { enter: () => { throw new Error('entry failed'); } });
		const controller = new ReaderActionController(reading);

		await expect(controller.switchTo(markup)).rejects.toThrow('entry failed');
		expect(controller.currentState).toBe(reading);
		expect(reading.enter).toHaveBeenCalledWith(ReaderActionEntry.Resume);
		expect(controller.transitioning).toBe(false);
	});

	it('does not exit or reenter an already active state', async () => {
		const reading = state(ReaderActionKind.Reading);
		const controller = new ReaderActionController(reading);
		expect(await controller.switchTo(reading)).toBe(ReaderActionOutcome.Entered);
		expect(reading.exit).not.toHaveBeenCalled();
		expect(reading.enter).not.toHaveBeenCalled();
	});

	it('resets immediately and prevents an older async exit from activating another state', async () => {
		const save = deferred<boolean>();
		const markup = state(ReaderActionKind.TextMarkup, {
			exit: (reason) => reason === ReaderActionExitReason.ContextReset ? true : save.promise
		});
		const bookmark = state(ReaderActionKind.AddBookmark);
		const reading = state(ReaderActionKind.Reading);
		const controller = new ReaderActionController(markup);

		const switching = controller.enterTemporary(bookmark);
		const resetting = controller.resetForContext(reading);
		expect(controller.currentState).toBe(reading);
		save.resolve(true);
		expect(await switching).toBe(ReaderActionOutcome.Blocked);
		expect(await resetting).toBe(ReaderActionOutcome.Entered);
		expect(bookmark.enter).not.toHaveBeenCalled();
		expect(markup.exit).toHaveBeenCalledWith(ReaderActionExitReason.ContextReset);
		expect(reading.enter).toHaveBeenCalledWith(ReaderActionEntry.Initial);
		expect(controller.transitioning).toBe(false);
	});

	it('keeps Reader controller instances independent', async () => {
		const first = new ReaderActionController(state(ReaderActionKind.Reading));
		const secondReading = state(ReaderActionKind.Reading);
		const second = new ReaderActionController(secondReading);

		expect(await first.enterTemporary(state(ReaderActionKind.AddNote))).toBe(ReaderActionOutcome.Entered);
		expect(second.currentState).toBe(secondReading);
		expect(second.transitioning).toBe(false);
	});
});
