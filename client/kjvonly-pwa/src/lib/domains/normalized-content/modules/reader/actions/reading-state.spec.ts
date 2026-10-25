import { describe, expect, it } from 'vitest';
import { ReadingState } from './reading-state';
import {
	ReaderActionEntry,
	ReaderActionExitReason,
	ReaderActionKind,
	ReaderActionOutcome
} from './reader-action-state';
import { word } from './word-action-test-fixtures';

describe('ReadingState', () => {
	it('leaves normal word/link handling to the Reader and never edits on drag', () => {
		const state = new ReadingState();
		expect(state.kind).toBe(ReaderActionKind.Reading);
		expect(state.enter(ReaderActionEntry.Initial)).toBe(ReaderActionOutcome.Entered);
		expect(state.onWordClick(word)).toBe(false);
		expect(state.onLinkActivate(['#internal'])).toBe(false);
		expect(state.onDragApply(word)).toBeUndefined();
		expect(state.onDragRemove(word)).toBeUndefined();
		expect(state.exit(ReaderActionExitReason.SwitchAction)).toBe(true);
		expect(state.enter(ReaderActionEntry.Resume)).toBe(ReaderActionOutcome.Entered);
	});
});
