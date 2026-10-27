import { describe, expect, it, vi } from 'vitest';
import { AddBookmarkState } from './add-bookmark-state.svelte';
import { ReaderActionController } from './reader-action-controller.svelte';
import {
	ReaderActionEntry,
	ReaderActionExitReason,
	ReaderActionKind,
	ReaderActionOutcome
} from './reader-action-state';
import { WithoutMarkupState } from './without-markup-state';
import type { NormalizedContentBookmarkSelection } from '../runtime/normalized-content-bookmark-selection';
import { deferred, invalidWord, word, wordActionEnvironment } from './word-action-test-fixtures';

describe('AddBookmarkState', () => {
	it('creates one Bookmark and returns to the captured state', async () => {
		const env = wordActionEnvironment();
		const create = vi.fn(async (_selection: NormalizedContentBookmarkSelection) => {});
		const showError = vi.fn();
		const origin = new WithoutMarkupState();
		let controller!: ReaderActionController;
		const state = new AddBookmarkState({
			read: env.read, showError, create,
			complete: async () => (await controller.returnFromTemporary(
				ReaderActionExitReason.ActionComplete
			)) === ReaderActionOutcome.Entered
		});
		controller = new ReaderActionController(origin);
		expect(await controller.enterTemporary(state)).toBe(ReaderActionOutcome.Entered);
		expect(state.kind).toBe(ReaderActionKind.AddBookmark);
		expect(state.onLinkActivate(['#internal'])).toBe(true);
		expect(state.onDragApply(word)).toBeUndefined();
		expect(state.onDragRemove(word)).toBeUndefined();
		expect(state.onWordClick(word)).toBe(true);
		await vi.waitFor(() => expect(controller.currentState).toBe(origin));
		expect(create).toHaveBeenCalledTimes(1);
		expect(create.mock.calls[0][0].target.address).toEqual({ kind: 'word', ...word });
		expect(showError).not.toHaveBeenCalled();
	});

	it('blocks duplicate submission and allows retry after a failed create', async () => {
		const env = wordActionEnvironment();
		const pending = deferred();
		const create = vi.fn()
			.mockImplementationOnce(() => pending.promise)
			.mockResolvedValue(undefined);
		const showError = vi.fn();
		const complete = vi.fn(async () => true);
		const state = new AddBookmarkState({ read: env.read, create, showError, complete });
		state.enter(ReaderActionEntry.Initial);
		state.onWordClick(word);
		state.onWordClick(word);
		expect(state.busy).toBe(true);
		expect(state.exit(ReaderActionExitReason.Cancel)).toBe(false);
		expect(create).toHaveBeenCalledTimes(1);
		pending.reject(new Error('storage failure'));
		await vi.waitFor(() => expect(state.busy).toBe(false));
		expect(showError).toHaveBeenCalledWith('Could not add Bookmark');
		expect(complete).not.toHaveBeenCalled();
		expect(state.onWordClick(invalidWord)).toBe(true);
		expect(showError).toHaveBeenCalledWith('Unable to select word for bookmark');
		// A rejected first write must leave the state usable for a real retry.
		expect(state.onWordClick(word)).toBe(true);
		await vi.waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
		expect(create).toHaveBeenCalledTimes(2);
	});

	it('does not complete a Bookmark created for an obsolete context', async () => {
		const env = wordActionEnvironment();
		const pending = deferred();
		const complete = vi.fn(async () => true);
		const state = new AddBookmarkState({
			read: env.read, showError: vi.fn(), create: () => pending.promise, complete
		});
		state.enter(ReaderActionEntry.Initial);
		state.onWordClick(word);
		expect(state.busy).toBe(true);
		env.change({ publisher: 'different-owner' });
		expect(state.exit(ReaderActionExitReason.ContextReset)).toBe(true);
		pending.resolve();
		await vi.waitFor(() => expect(state.busy).toBe(false));
		expect(complete).not.toHaveBeenCalled();
	});

	it('requires a signed-in user and a document before starting selection', () => {
		const env = wordActionEnvironment();
		const showError = vi.fn();
		const state = new AddBookmarkState({
			read: env.read, showError, create: vi.fn(), complete: vi.fn()
		});
		env.change({ publisher: undefined });
		expect(state.enter(ReaderActionEntry.Initial)).toBe(ReaderActionOutcome.Rejected);
		expect(showError).toHaveBeenCalledWith('Login first');
		env.change({ publisher: 'owner', document: undefined });
		expect(state.enter(ReaderActionEntry.Initial)).toBe(ReaderActionOutcome.Rejected);
		expect(showError).toHaveBeenCalledWith('Document unavailable');
	});
});
