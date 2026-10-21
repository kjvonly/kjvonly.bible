import { describe, expect, it } from 'vitest';
import { createHtmlNormalizer } from './create-html-normalizer.js';

describe('shared HTML normalization API', () => {
	it('normalizes dictionary-style HTML and exposes diagnostics without using a browser DOM', () => {
		const normalizer = createHtmlNormalizer();
		const html = '<div><p><b>AAM</b>, <i>noun</i> A measure.</p></div>';
		const result = normalizer.normalizeWithDiagnostics(html);
		expect(result.document.blocks).toHaveLength(1);
		expect(result.diagnostics.blocksProduced).toBeGreaterThan(0);
		expect(result.diagnostics.wordsProduced).toBeGreaterThan(0);
		expect(normalizer.normalize(html)).toEqual(result.document);
	});

	it('resets generated block IDs between documents', () => {
		const normalizer = createHtmlNormalizer();
		const first = normalizer.normalize('<p>one</p>');
		const second = normalizer.normalize('<p>two</p>');
		expect(first.blocks[0]?.id).toEqual(second.blocks[0]?.id);
	});
});
