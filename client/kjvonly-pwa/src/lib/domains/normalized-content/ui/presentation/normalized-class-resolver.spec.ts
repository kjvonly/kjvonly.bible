import {
	describe,
	expect,
	it
} from 'vitest';

import {
	resolveNormalizedClasses
} from './normalized-class-resolver';

describe(
	'resolveNormalizedClasses',
	() => {
		it.each([
			[
				'text-center',
				'text-center'
			],
			[
				'indent',
				'indent-6'
			],
			[
				'small',
				'text-sm'
			],
			[
				'color-blue',
				'text-vivid-b-700'
			],
			[
				'color-green',
				'text-support-a-700'
			],
			[
				'color-dark-blue',
				'text-vivid-b-900'
			],
			[
				'color-red-brown',
				'text-support-b-700'
			],
			[
				'nowrap',
				'whitespace-nowrap'
			]
		])(
			'maps %s to controlled application presentation',
			(
				sourceClass,
				expectedClass
			) => {
				expect(
					resolveNormalizedClasses([
						sourceClass
					])
				).toBe(
					expectedClass
				);
			}
		);

		it(
			'composes multiple known classes in source order',
			() => {
				expect(
					resolveNormalizedClasses([
						'text-center',
						'color-dark-blue',
						'small'
					])
				).toBe(
					'text-center text-vivid-b-900 text-sm'
				);
			}
		);

		it(
			'deduplicates mapped application classes',
			() => {
				expect(
					resolveNormalizedClasses([
						'small',
						'small'
					])
				).toBe(
					'text-sm'
				);
			}
		);

		it.each([
			'quote-text',
			'scripSection',
			'list-marker',
			'list-marker-roman',
			'list-marker-arabic',
			'list-roman',
			'list-arabic',
			'blb-tagged'
		])(
			'ignores known source-only class %s',
			(sourceClass) => {
				expect(
					resolveNormalizedClasses([
						sourceClass
					])
				).toBeUndefined();
			}
		);

		it(
			'ignores unknown publisher classes instead of leaking them',
			() => {
				expect(
					resolveNormalizedClasses([
						'publisher-special',
						'text-center'
					])
				).toBe(
					'text-center'
				);
			}
		);

		it.each([
			undefined,
			null,
			[]
		])(
			'returns undefined when no presentation class remains',
			(classes) => {
				expect(
					resolveNormalizedClasses(
						classes
					)
				).toBeUndefined();
			}
		);
	}
);
