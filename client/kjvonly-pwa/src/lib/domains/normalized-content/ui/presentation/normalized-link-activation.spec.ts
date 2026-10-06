import {
	describe,
	expect,
	it
} from 'vitest';

import {
	shouldDelegateNormalizedLinkActivation
} from './normalized-link-activation';

describe('shouldDelegateNormalizedLinkActivation', () => {
	it('delegates an ordinary primary-button activation', () => {
		expect(
			shouldDelegateNormalizedLinkActivation(
				gesture()
			)
		).toBe(true);
	});

	it.each([
		['non-primary button', { button: 1 }],
		['alt', { altKey: true }],
		['control', { ctrlKey: true }],
		['meta', { metaKey: true }],
		['shift', { shiftKey: true }]
	])(
		'preserves native behavior for %s activation',
		(_name, overrides) => {
			expect(
				shouldDelegateNormalizedLinkActivation(
					gesture(overrides)
				)
			).toBe(false);
		}
	);
});

function gesture(
	overrides: Partial<{
		button: number;
		altKey: boolean;
		ctrlKey: boolean;
		metaKey: boolean;
		shiftKey: boolean;
	}> = {}
) {
	return {
		button: 0,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		shiftKey: false,
		...overrides
	};
}
