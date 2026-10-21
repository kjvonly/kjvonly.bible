import { describe, expect, it } from 'vitest';
import { Modules } from '$lib/application';
import { NORMALIZED_CONTENT_VIEWS } from '../../../models/normalized-content-navigation.model';
import { validateNormalizedContentReaderNavigationState } from './normalized-content-reader-navigation-state';

const descriptor = { metadata: { resourceId: 'document/1' } };
const validState = {
	module: Modules.NORMALIZED_CONTENT,
	view: NORMALIZED_CONTENT_VIEWS.READER,
	state: { descriptor }
};

function expectInvalid(value: unknown): void {
	expect(() => validateNormalizedContentReaderNavigationState(value))
		.toThrow('Invalid Normalized Content navigation state');
}

describe('Normalized Content Reader navigation state', () => {
	it('accepts a standalone document descriptor', () => {
		expect(() => validateNormalizedContentReaderNavigationState(validState)).not.toThrow();
	});

	it('accepts an ordered Resource sequence with a valid selected index', () => {
		const sequence = [
			{ descriptor, fileName: 'one.nd.json' },
			{ descriptor: { metadata: { resourceId: 'document/2' } }, fileName: 'two.nd.json' }
		];
		expect(() => validateNormalizedContentReaderNavigationState({
			...validState, state: { descriptor, sequence, sequenceIndex: 1 }
		})).not.toThrow();
	});

	it('rejects a different module or view and missing descriptor', () => {
		expectInvalid({ ...validState, module: Modules.BIBLE });
		expectInvalid({ ...validState, view: NORMALIZED_CONTENT_VIEWS.OVERFLOW_ACTIONS });
		expectInvalid({ ...validState, state: {} });
		expectInvalid({ ...validState, state: { descriptor: null } });
	});

	it('rejects invalid sequence indexes, empty sequences, and malformed entries', () => {
		const sequence = [{ descriptor, fileName: 'one.nd.json' }];
		for (const state of [
			{ descriptor, sequence, sequenceIndex: -1 },
			{ descriptor, sequence, sequenceIndex: 1 },
			{ descriptor, sequence, sequenceIndex: 0.5 },
			{ descriptor, sequence },
			{ descriptor, sequence: [], sequenceIndex: 0 },
			{ descriptor, sequence: [{ descriptor }], sequenceIndex: 0 },
			{ descriptor, sequence: [null], sequenceIndex: 0 }
		]) {
			expectInvalid({ ...validState, state });
		}
	});
});
