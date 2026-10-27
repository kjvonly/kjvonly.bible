import { describe, expect, it, vi } from 'vitest';
import type { NormalizedDocument } from '@kjvonly/normalized-content';
import { createHtmlNormalizer } from '@kjvonly/html-normalized-content';
import { normalizeDictionaryDefinitions } from './dictionary-definition-normalizer';

/** Normalization is injectable: this test checks ordering and parser delegation. */
describe('normalizeDictionaryDefinitions', () => {
	it('converts ordered definitions together so generated DOM IDs remain unique', () => {
		const document = { blocks: [{ id: 'p1' }, { id: 'p2' }] } as unknown as NormalizedDocument;
		const normalize = vi.fn(() => document);
		const result = normalizeDictionaryDefinitions([
			{ word: 'aam', content: '<p>first</p>' },
			{ word: 'aam', content: '<p><b>second</b></p>' }
		], { normalize });
		expect(normalize).toHaveBeenCalledExactlyOnceWith('<p>first</p>\n<p><b>second</b></p>');
		expect(result).toBe(document);
	});

	it('preserves bold and italic words in the actual shared HTML parser', () => {
		const documents = normalizeDictionaryDefinitions([
			{ word: 'aam', content: '<div><p><b>AAM</b>, <i>noun</i> A measure of liquids.</p></div>' }
		], createHtmlNormalizer());
		expect(documents.blocks).toHaveLength(1);
		const paragraph = documents.blocks[0];
		expect(paragraph?.type).toBe('paragraph');
		if (paragraph?.type !== 'paragraph') throw new Error('Expected paragraph');
		expect(paragraph.content).toEqual(expect.arrayContaining([
			expect.objectContaining({ type: 'word', text: 'AAM', strong: true }),
			expect.objectContaining({ type: 'word', text: 'noun', emphasis: true })
		]));
	});

	it('rejects non-Webster stored data instead of attempting HTML normalization', () => {
		const normalize = vi.fn();
		expect(() => normalizeDictionaryDefinitions({ number: 'G26' }, { normalize })).toThrow('not valid Webster HTML');
		expect(normalize).not.toHaveBeenCalled();
	});

	it('propagates conversion failures instead of rendering raw HTML', () => {
		const normalize = vi.fn((): NormalizedDocument => { throw new Error('Unsupported HTML'); });
		expect(() => normalizeDictionaryDefinitions([{ word: 'aam', content: '<bad />' }], { normalize }))
			.toThrow('Unsupported HTML');
	});
});
