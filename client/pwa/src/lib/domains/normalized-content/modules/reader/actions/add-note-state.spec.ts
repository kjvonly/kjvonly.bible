import { describe, expect, it, vi } from 'vitest';
import { AddNoteState } from './add-note-state.svelte';
import { ReaderActionController } from './reader-action-controller.svelte';
import {
	ReaderActionEntry,
	ReaderActionExitReason,
	ReaderActionKind,
	ReaderActionOutcome
} from './reader-action-state';
import { WithoutMarkupState } from './without-markup-state';
import { deferred, invalidWord, word, wordActionEnvironment } from './word-action-test-fixtures';

describe('AddNoteState', () => {
	it('selects a canonical word and opens Notes after returning to the captured state', async () => {
		const env = wordActionEnvironment();
		const openNotes = vi.fn();
		const showError = vi.fn();
		const origin = new WithoutMarkupState();
		let controller!: ReaderActionController;
		const state = new AddNoteState({
			read: env.read, showError, openNotes,
			complete: async () => (await controller.returnFromTemporary(
				ReaderActionExitReason.ActionComplete
			)) === ReaderActionOutcome.Entered
		});
		controller = new ReaderActionController(origin);
		expect(await controller.enterTemporary(state)).toBe(ReaderActionOutcome.Entered);
		expect(state.kind).toBe(ReaderActionKind.AddNote);
		expect(state.onLinkActivate(['#internal'])).toBe(true);
		expect(state.onDragApply(word)).toBeUndefined();
		expect(state.onDragRemove(word)).toBeUndefined();
		expect(state.onWordClick(word)).toBe(true);
		await vi.waitFor(() => expect(openNotes).toHaveBeenCalledTimes(1));
		expect(openNotes.mock.calls[0][0].normalizedDocument.createTarget.target).toEqual({
			kind: 'word', address: word
		});
		expect(controller.currentState).toBe(origin);
		expect(showError).not.toHaveBeenCalled();
	});

	it('rejects an invalid word without completing the action', () => {
		const env = wordActionEnvironment();
		const showError = vi.fn();
		const openNotes = vi.fn();
		const complete = vi.fn(async () => true);
		const state = new AddNoteState({ read: env.read, showError, openNotes, complete });
		state.enter(ReaderActionEntry.Initial);
		expect(state.onWordClick(invalidWord)).toBe(true);
		expect(showError).toHaveBeenCalledWith('Unable to select word for note');
		expect(openNotes).not.toHaveBeenCalled();
		expect(complete).not.toHaveBeenCalled();
	});

	it('does not navigate when the controller cannot complete the temporary action', async () => {
		const env = wordActionEnvironment();
		const openNotes = vi.fn();
		const complete = vi.fn(async () => false);
		const state = new AddNoteState({ read: env.read, showError: vi.fn(), openNotes, complete });
		state.enter(ReaderActionEntry.Initial);
		state.onWordClick(word);
		await vi.waitFor(() => expect(state.busy).toBe(false));
		expect(complete).toHaveBeenCalledOnce();
		expect(openNotes).not.toHaveBeenCalled();
	});

	it('does not open Notes after its document/account context changes', async () => {
		const env = wordActionEnvironment();
		const pending = deferred();
		const openNotes = vi.fn();
		const state = new AddNoteState({
			read: env.read, showError: vi.fn(), openNotes,
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
		expect(openNotes).not.toHaveBeenCalled();
	});
});
