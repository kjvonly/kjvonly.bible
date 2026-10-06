import type {
	Element
} from 'domhandler';

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	shouldPreserveEmptySemanticBlock
} from './should-preserve-empty-semantic-block.js';

describe(
	'shouldPreserveEmptySemanticBlock',
	() => {
		it(
			'preserves an empty semantic element with a source id',
			() => {
				expect(
					shouldPreserveEmptySemanticBlock(
						element({
							id:
								'anchor'
						})
					)
				).toBe(
					true
				);
			}
		);

		it(
			'preserves supported normalized presentation',
			() => {
				expect(
					shouldPreserveEmptySemanticBlock(
						element({
							class:
								'text-center'
						})
					)
				).toBe(
					true
				);

				expect(
					shouldPreserveEmptySemanticBlock(
						element({
							style:
								'text-align: center'
						})
					)
				).toBe(
					true
				);
			}
		);

		it(
			'does not preserve non-canonical metadata',
			() => {
				for (
					const attribs of [
						{},
						{
							class:
								'publisher-only'
						},
						{
							style:
								'color: red'
						}
					] as Array<Record<string, string>>
				) {
					expect(
						shouldPreserveEmptySemanticBlock(
							element(
								attribs
							)
						)
					).toBe(
						false
					);
				}
			}
		);
	}
);

function element(
	attribs: Record<string, string>
): Element {
	return {
		name:
			'p',
		attribs
	} as Element;
}
