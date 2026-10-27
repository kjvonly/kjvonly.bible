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
				'nowrap',
				'whitespace-nowrap'
			]
		] as const)(
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
			'composes canonical presentation classes in source order',
			() => {
				expect(
					resolveNormalizedClasses([
						'text-center',
						'indent',
						'nowrap'
					])
				).toBe(
					'text-center indent-6 whitespace-nowrap'
				);
			}
		);

		it.each([
			'list-roman',
			'list-arabic'
		] as const)(
			'leaves structural list class %s to list presentation',
			(sourceClass) => {
				expect(
					resolveNormalizedClasses([
						sourceClass
					])
				).toBeUndefined();
			}
		);

		it.each([
			undefined,
			[]
		] as const)(
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
