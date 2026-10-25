import { describe, expect, it } from 'vitest';
import { WithoutMarkupState } from './without-markup-state';
import {
	ReaderActionEntry,
	ReaderActionExitReason,
	ReaderActionKind,
	ReaderActionOutcome
} from './reader-action-state';
import { word } from './word-action-test-fixtures';

describe('WithoutMarkupState', () => {
	it('consumes clicks without writing markup and allows normal link routing', () => {
		const state = new WithoutMarkupState();
		expect(state.kind).toBe(ReaderActionKind.WithoutMarkup);
		expect(state.enter(ReaderActionEntry.Initial)).toBe(ReaderActionOutcome.Entered);
		expect(state.onWordClick(word)).toBe(true);
		expect(state.onLinkActivate(['#internal'])).toBe(false);
		expect(state.onDragApply(word)).toBeUndefined();
		expect(state.onDragRemove(word)).toBeUndefined();
		expect(state.exit(ReaderActionExitReason.SwitchAction)).toBe(true);
		expect(state.enter(ReaderActionEntry.Resume)).toBe(ReaderActionOutcome.Entered);
	});
});
