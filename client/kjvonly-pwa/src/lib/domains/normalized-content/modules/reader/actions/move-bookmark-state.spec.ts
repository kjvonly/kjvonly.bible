import { describe, expect, it, vi } from 'vitest';
import { MoveBookmarkState } from './move-bookmark-state.svelte';
import { ReaderActionController } from './reader-action-controller.svelte';
import {
	ReaderActionEntry,
	ReaderActionExitReason,
	ReaderActionKind,
	ReaderActionOutcome
} from './reader-action-state';
import { WithoutMarkupState } from './without-markup-state';
import { deferred, invalidWord, word, wordActionEnvironment } from './word-action-test-fixtures';

describe('MoveBookmarkState', () => {
	it('opens the existing relocation picker after returning to the captured state', async () => {
		const env = wordActionEnvironment();
		const openRelocationPicker = vi.fn();
		const showError = vi.fn();
		const origin = new WithoutMarkupState();
		let controller!: ReaderActionController;
		const state = new MoveBookmarkState({
			read: env.read, openRelocationPicker, showError,
			complete: async () => (await controller.returnFromTemporary(
				ReaderActionExitReason.ActionComplete
			)) === ReaderActionOutcome.Entered
		});
		controller = new ReaderActionController(origin);
		expect(await controller.enterTemporary(state)).toBe(ReaderActionOutcome.Entered);
		expect(state.kind).toBe(ReaderActionKind.MoveBookmark);
		expect(state.onLinkActivate(['#internal'])).toBe(true);
		expect(state.onDragApply(word)).toBeUndefined();
		expect(state.onDragRemove(word)).toBeUndefined();
		expect(state.onWordClick(word)).toBe(true);
		await vi.waitFor(() => expect(openRelocationPicker).toHaveBeenCalledTimes(1));
		expect(openRelocationPicker.mock.calls[0][0].target.address)
			.toEqual({ kind: 'word', ...word });
		expect(controller.currentState).toBe(origin);
		expect(showError).not.toHaveBeenCalled();
	});

	it('keeps the selection active on an invalid destination', () => {
		const env = wordActionEnvironment();
		const showError = vi.fn();
		const openRelocationPicker = vi.fn();
		const complete = vi.fn(async () => true);
		const state = new MoveBookmarkState({
			read: env.read, showError, openRelocationPicker, complete
		});
		state.enter(ReaderActionEntry.Initial);
		expect(state.onWordClick(invalidWord)).toBe(true);
		expect(showError).toHaveBeenCalledWith('Unable to select word for bookmark');
		expect(complete).not.toHaveBeenCalled();
		expect(openRelocationPicker).not.toHaveBeenCalled();
	});

	it('does not open the picker if the controller refuses completion', async () => {
		const env = wordActionEnvironment();
		const openRelocationPicker = vi.fn();
		const complete = vi.fn(async () => false);
		const state = new MoveBookmarkState({
			read: env.read, showError: vi.fn(), openRelocationPicker, complete
		});
		state.enter(ReaderActionEntry.Initial);
		state.onWordClick(word);
		await vi.waitFor(() => expect(state.busy).toBe(false));
		expect(complete).toHaveBeenCalledOnce();
		expect(openRelocationPicker).not.toHaveBeenCalled();
	});

	it('suppresses obsolete picker navigation after context reset', async () => {
		const env = wordActionEnvironment();
		const pending = deferred();
		const openRelocationPicker = vi.fn();
		const state = new MoveBookmarkState({
			read: env.read, showError: vi.fn(), openRelocationPicker,
			complete: async () => { await pending.promise; return true; }
		});
		state.enter(ReaderActionEntry.Initial);
		state.onWordClick(word);
		expect(state.busy).toBe(true);
		expect(state.exit(ReaderActionExitReason.Cancel)).toBe(false);
		env.change({ publisher: 'different-owner' });
		expect(state.exit(ReaderActionExitReason.ContextReset)).toBe(true);
		pending.resolve();
		await vi.waitFor(() => expect(state.busy).toBe(false));
		expect(openRelocationPicker).not.toHaveBeenCalled();
	});
});
