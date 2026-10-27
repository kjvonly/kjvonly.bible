import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NormalizedDocument
} from '@kjvonly/normalized-content';

import {
	assertNormalizedContentWordAddress,
	resolveNormalizedContentAtAddress
} from './normalized-content-address.model';

const DOCUMENT: NormalizedDocument = {
	blocks: [
		{
			type: 'paragraph',
			id: 'paragraph-1',
			content: [
				{
					type: 'word',
					text: 'First'
				},
				{
					type: 'anchor',
					id: 'anchor-1'
				},
				{
					type: 'line-break'
				}
			]
		},
		{
			type: 'quote',
			id: 'quote-1',
			blocks: [
				{
					type: 'paragraph',
					id: 'nested-paragraph',
					content: [
						{
							type: 'word',
							text: 'Nested'
						}
					]
				}
			]
		}
	]
};

describe(
	'resolveNormalizedContentAtAddress',
	() => {
		it(
			'resolves canonical inline entries by block identity and content index',
			() => {
				expect(
					resolveNormalizedContentAtAddress(
						DOCUMENT,
						{
							blockId:
								'paragraph-1',
							contentIndex: 0
						}
					)
				).toEqual({
					type: 'word',
					text: 'First'
				});

				expect(
					resolveNormalizedContentAtAddress(
						DOCUMENT,
						{
							blockId:
								'paragraph-1',
							contentIndex: 1
						}
					)
				).toEqual({
					type: 'anchor',
					id: 'anchor-1'
				});
			}
		);

		it(
			'resolves content in nested canonical blocks',
			() => {
				expect(
					resolveNormalizedContentAtAddress(
						DOCUMENT,
						{
							blockId:
								'nested-paragraph',
							contentIndex: 0
						}
					)
				).toEqual({
					type: 'word',
					text: 'Nested'
				});
			}
		);

		it(
			'returns undefined for unresolved or invalid snapshot-local addresses',
			() => {
				expect(
					resolveNormalizedContentAtAddress(
						DOCUMENT,
						{
							blockId:
								'missing',
							contentIndex: 0
						}
					)
				).toBeUndefined();

				expect(
					resolveNormalizedContentAtAddress(
						DOCUMENT,
						{
							blockId:
								'quote-1',
							contentIndex: 0
						}
					)
				).toBeUndefined();

				expect(
					resolveNormalizedContentAtAddress(
						DOCUMENT,
						{
							blockId:
								'paragraph-1',
							contentIndex: 99
						}
					)
				).toBeUndefined();

				expect(
					resolveNormalizedContentAtAddress(
						DOCUMENT,
						{
							blockId:
								'paragraph-1',
							contentIndex: -1
						}
					)
				).toBeUndefined();

				expect(
					resolveNormalizedContentAtAddress(
						DOCUMENT,
						{
							blockId:
								'paragraph-1',
							contentIndex: 1.5
						}
					)
				).toBeUndefined();
			}
		);
	}
);


describe('assertNormalizedContentWordAddress', () => {
	it('accepts a canonical word, including inside nested blocks', () => {
		expect(() => assertNormalizedContentWordAddress(DOCUMENT, {
			blockId: 'nested-paragraph', contentIndex: 0
		})).not.toThrow();
	});

	it('rejects anchors, missing entries, and missing blocks', () => {
		for (const address of [
			{ blockId: 'paragraph-1', contentIndex: 1 },
			{ blockId: 'paragraph-1', contentIndex: 99 },
			{ blockId: 'missing', contentIndex: 0 }
		]) {
			expect(() => assertNormalizedContentWordAddress(DOCUMENT, address))
				.toThrow('canonical word');
		}
	});
});
