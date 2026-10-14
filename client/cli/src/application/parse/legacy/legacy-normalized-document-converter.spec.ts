import { describe, expect, it } from 'vitest';
import { NormalizedDocumentValidator, type NormalizedBlock } from '@kjvonly/normalized-content';
import { LegacyNormalizedDocumentConverter } from './legacy-normalized-document-converter.js';

const converter = new LegacyNormalizedDocumentConverter(new NormalizedDocumentValidator());

function textBlock(text: string, words: string[], type: 'text' | 'paragraph' = 'text') {
	return {
		type, id: null, class: ['color-dark-blue', 'indent'], text,
		content: words.map(word => ({
			type: 'word', text: word, class: ['color-green'],
			href: null, emphasis: false, strong: false, marks: null
		}))
	};
}

function list(markerNames: string[], style = 'list-roman'): {
	type: 'list'; id: null; class: string[]; ordered: true;
	blocks: { type: 'list-item'; id: null; class: null; blocks: unknown[] }[]
} {
	return {
		type: 'list', id: null, class: [style], ordered: true,
		blocks: markerNames.map(marker => ({
			type: 'list-item', id: null, class: null,
			blocks: [textBlock(`${marker} Sermon point`, [marker, 'Sermon', 'point'])]
		}))
	};
}

/** Compare the complete original list-item text, not an array prefix. */
function leadingListItemWords(list: Extract<NormalizedBlock, { type: 'list' }>): string[][] {
	return list.blocks.map(item => {
		const leading = item.blocks[0];
		if (leading?.type !== 'text') throw new Error('Expected a leading text block.');
		return leading.content.map(unit => {
			if (unit.type !== 'word') throw new Error('Expected a word token.');
			return unit.text;
		});
	});
}

describe('LegacyNormalizedDocumentConverter', () => {
	it('preserves words, spacing, line breaks, formatting, and provenance without HTML', () => {
		const paragraph = {
			type: 'paragraph', id: null, class: ['text-center', 'color-blue'],
			text: 'Welcome, friend!\nGrace is here.', content: [
				{ type: 'word', text: 'Welcome', class: null, href: null, emphasis: false, strong: true, marks: null },
				{ type: 'word', text: ',', class: null, href: null, emphasis: false, strong: false, marks: null },
				{ type: 'word', text: 'friend!', class: null, href: null, emphasis: true, strong: false, marks: null },
				{ type: 'line-break' },
				{ type: 'word', text: 'Grace', class: null, href: null, emphasis: false, strong: false, marks: null },
				{ type: 'word', text: 'is', class: null, href: null, emphasis: false, strong: false, marks: null },
				{ type: 'word', text: 'here.', class: null, href: null, emphasis: false, strong: false, marks: null }
			]
		};
		const actual = converter.convert({ source: 'chs1.pdf', blocks: [paragraph] });
		expect(actual.source).toBe('chs1.pdf');
		expect(actual.blocks[0]).toMatchObject({
			type: 'paragraph', id: 'nd-v1-paragraph-1', class: ['text-center'],
			content: [
				{ type: 'word', text: 'Welcome', strong: true },
				{ type: 'word', text: ',', joinPrevious: true },
				{ type: 'word', text: 'friend!', emphasis: true },
				{ type: 'line-break' },
				{ type: 'word', text: 'Grace' },
				{ type: 'word', text: 'is' },
				{ type: 'word', text: 'here.' }
			]
		});
		expect('text' in actual.blocks[0]!).toBe(false);
	});

	it('accepts only canonical heading levels from legacy JSON', () => {
		const heading = (level: unknown) => ({
			...textBlock('Sermon Title', ['Sermon', 'Title']),
			type: 'heading', level
		});
		for (const level of [1, 2, 3, 4, 5, 6]) {
			const converted = converter.convert({ blocks: [heading(level)] });
			expect(converted.blocks[0]).toMatchObject({ type: 'heading', level });
		}
		for (const level of [0, 7, -1, 2.5, '2', null]) {
			expect(() => converter.convert({ blocks: [heading(level)] }))
				.toThrow(/heading level between 1 and 6/);
		}
	});

	it('keeps nested structure, generating unique IDs and removing sequential Roman markers', () => {
		const roman = list(['I.', 'II.', 'III.']);
		roman.blocks[0]!.blocks.push(list(['1.', '2.'], 'list-arabic'));
		const document = converter.convert({ source: 'chs1000.pdf', blocks: [
			{
				type: 'quote', id: null, class: ['quote-text'],
				blocks: [textBlock('Quoted text', ['Quoted', 'text'], 'paragraph')]
			},
			roman
		] });
		const quote = document.blocks[0];
		const romanList = document.blocks[1];
		expect(quote).toMatchObject({ type: 'quote', id: 'nd-v1-quote-1' });
		expect(romanList).toMatchObject({
			type: 'list', id: 'nd-v1-list-1', ordered: true, class: ['list-roman']
		});
		if (romanList?.type !== 'list') throw new Error('Unexpected list type.');
		expect(romanList.blocks).toHaveLength(3);
		expect(romanList.blocks[0]?.blocks[1]).toMatchObject({
			type: 'list', ordered: true, class: ['list-arabic'],
			blocks: [{ type: 'list-item' }, { type: 'list-item' }]
		});
		expect(romanList.blocks[0]?.blocks[0]).toMatchObject({
			type: 'text', content: [{ type: 'word', text: 'Sermon' }, { type: 'word', text: 'point' }]
		});
		const ids: string[] = [];
		function collect(block: { id: string; blocks?: readonly unknown[] }) {
			ids.push(block.id);
			for (const child of block.blocks ?? []) collect(child as typeof block);
		}
		for (const block of document.blocks) collect(block);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('retains irregular Roman markers exactly in an unbulleted unordered list', () => {
		const actual = converter.convert({ blocks: [list(['I.', 'II.', 'II.', 'III.'])] });
		const block = actual.blocks[0];
		expect(block).toMatchObject({ type: 'list', ordered: false, class: ['list-roman'] });
		if (block?.type !== 'list') throw new Error('Unexpected list type.');
		expect(leadingListItemWords(block)).toEqual([
			['I.', 'Sermon', 'point'],
			['II.', 'Sermon', 'point'],
			['II.', 'Sermon', 'point'],
			['III.', 'Sermon', 'point']
		]);
	});

	it('preserves scripture numbering beginning at 25 or 37', () => {
		for (const number of [25, 37]) {
			const block = converter.convert({ blocks: [
				list([`${number}.`, `${number + 1}.`], 'list-arabic')
			] }).blocks[0];
			expect(block).toMatchObject({ type: 'list', ordered: false, class: ['list-arabic'] });
			if (block?.type !== 'list') throw new Error('Unexpected list type.');
			expect(leadingListItemWords(block)).toEqual([
				[`${number}.`, 'Sermon', 'point'],
				[`${number + 1}.`, 'Sermon', 'point']
			]);
		}
	});

	it('does not strip earlier markers if a later list item is irregular', () => {
		const block = converter.convert({ blocks: [
			list(['I.', 'II.', 'IX.'])
		] }).blocks[0];
		if (block?.type !== 'list') throw new Error('Unexpected list type.');
		expect(block.ordered).toBe(false);
		expect(leadingListItemWords(block)).toEqual([
			['I.', 'Sermon', 'point'],
			['II.', 'Sermon', 'point'],
			['IX.', 'Sermon', 'point']
		]);
	});

	it('retains linked authored numbers instead of dropping marker metadata', () => {
		const roman = list(['I.', 'II.']);
		const first = roman.blocks[0]!.blocks[0] as ReturnType<typeof textBlock>;
		(first.content[0]! as { href: string[] | null }).href = ['/original-marker'];
		const block = converter.convert({ blocks: [roman] }).blocks[0];
		if (block?.type !== 'list') throw new Error('Unexpected list type.');
		expect(block.ordered).toBe(false);
		expect(leadingListItemWords(block)).toEqual([
			['I.', 'Sermon', 'point'],
			['II.', 'Sermon', 'point']
		]);
		const firstText = block.blocks[0]?.blocks[0];
		if (firstText?.type !== 'text') throw new Error('Unexpected list item content.');
		expect(firstText.content[0]).toMatchObject({
			type: 'word', text: 'I.', href: ['/original-marker']
		});
	});

	it('keeps nested and ordered lists independent of each other', () => {
		const parent = list(['I.', 'II.', 'II.']);
		parent.blocks[0]!.blocks.push(list(['1.', '2.'], 'list-arabic'));
		const actual = converter.convert({ blocks: [parent] }).blocks[0];
		if (actual?.type !== 'list') throw new Error('Unexpected list type.');
		expect(actual.ordered).toBe(false);
		expect(actual.blocks[0]?.blocks[1]).toMatchObject({
			type: 'list', ordered: true, class: ['list-arabic'],
			blocks: [{ type: 'list-item' }, { type: 'list-item' }]
		});
	});

	it('converts legacy inline captions into canonical flow blocks without losing tokens', () => {
		const legacyCaption = {
			...textBlock('Original caption.', ['Original', 'caption.']),
			type: 'caption', id: 'authored-caption', class: ['text-center', 'color-blue']
		};
		const document = converter.convert({ blocks: [
			{ type: 'figure', id: null, class: null, blocks: [legacyCaption] }
		] });
		expect(document.blocks[0]).toMatchObject({
			type: 'figure',
			blocks: [{
				type: 'caption', id: 'authored-caption', class: ['text-center'],
				blocks: [{
					type: 'text', id: 'nd-v1-text-1',
					content: [{ type: 'word', text: 'Original' }, { type: 'word', text: 'caption.' }]
				}]
			}]
		});
	});

	it('preserves optional legacy table header metadata and defaults missing headers to data cells', () => {
		const cell = (header?: unknown) => ({
			type: 'table-cell', id: null, class: null,
			...(header !== undefined ? { header } : {}),
			blocks: [textBlock('Cell text', ['Cell', 'text'])]
		});
		const table = (cells: unknown[]) => ({
			type: 'table', id: null, class: null, blocks: [{
				type: 'table-row', id: null, class: null, blocks: cells
			}]
		});
		const result = converter.convert({ blocks: [table([cell(true), cell(false), cell()])] });
		expect(result.blocks[0]).toMatchObject({
			type: 'table', blocks: [{ type: 'table-row', blocks: [
				{ type: 'table-cell', header: true },
				{ type: 'table-cell', header: false },
				{ type: 'table-cell', header: false }
			] }]
		});
		expect(() => converter.convert({ blocks: [table([cell('yes')])] }))
			.toThrow(/expected a boolean/);
	});

	it('rejects text/token disagreements without rewriting extracted words', () => {
		expect(() => converter.convert({ blocks: [textBlock('Wrong word', ['Another', 'word'])] }))
			.toThrow(/does not match legacy text/);
	});

	it('rejects unrecognized block types and source presentation instead of discarding content', () => {
		expect(() => converter.convert({ blocks: [{ type: 'video', id: null }] }))
			.toThrow(/unsupported legacy block type/);
		expect(() => converter.convert({ blocks: [{ ...textBlock('Hello', ['Hello']), class: ['unknown-style'] }] }))
			.toThrow(/unrecognized source class/);
		expect(() => converter.convert({ blocks: [{ ...textBlock('Hello', ['Hello']), extra: 'content' }] }))
			.toThrow(/unsupported legacy property/);
	});

	it('preserves authored IDs and reserves them ahead of generated IDs', () => {
		const authored = { ...textBlock('First', ['First']), id: 'nd-v1-text-1' };
		const result = converter.convert({ blocks: [textBlock('Second', ['Second']), authored] });
		expect(result.blocks.map(block => block.id)).toEqual(['nd-v1-text-2', 'nd-v1-text-1']);
	});
});
