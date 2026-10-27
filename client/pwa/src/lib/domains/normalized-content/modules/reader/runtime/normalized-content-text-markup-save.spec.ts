import { describe, expect, it } from 'vitest';
import type {
	NormalizedContentTextMarkup,
	NormalizedContentTextMarkupMap
} from '../../../models/normalized-content-text-markup.model';
import { captureNormalizedContentTextMarkupSave } from './normalized-content-text-markup-save';

function accepted(id = 'markup-a'): NormalizedContentTextMarkup {
	return { id, document: { publisher: 'document-publisher', resourceId: 'document/a', modifiedAt: 42 }, markings: {} };
}

describe('Normalized Content Text Markup save snapshot', () => {
	it('isolates nested markings and document reference from subsequent draft changes', () => {
		const original = accepted();
		const draft: NormalizedContentTextMarkupMap = { section: { '2': { class: ['bg-highlighta'] } } };
		const save = captureNormalizedContentTextMarkupSave(original, draft);
		draft.section['2'].class.push('underline');
		(original.document as { modifiedAt: number }).modifiedAt = 100;
		expect(save.document.modifiedAt).toBe(42);
		expect(save.markings.section['2'].class).toEqual(['bg-highlighta']);
		expect(save.document).not.toBe(original.document);
		expect(save.markings).not.toBe(draft);
	});
	it('preserves a canonical block ID named __proto__ as an own property', () => {
		const draft: NormalizedContentTextMarkupMap = {};
		Object.defineProperty(draft, '__proto__', {
			configurable: true, enumerable: true, writable: true,
			value: { '0': { class: ['bg-highlighta'] } }
		});
		const save = captureNormalizedContentTextMarkupSave(accepted(), draft);
		expect(Object.prototype.hasOwnProperty.call(save.markings, '__proto__')).toBe(true);
		expect(save.markings['__proto__']['0'].class).toEqual(['bg-highlighta']);
	});
});
