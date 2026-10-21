import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NormalizedContentTextMarkupMap
} from '../../models/normalized-content-text-markup.model';

import {
	cloneNormalizedContentTextMarkupMap,
	hasNormalizedContentTextMarkupDraftChanges
} from './normalized-content-text-markup-draft';

describe(
	'cloneNormalizedContentTextMarkupMap',
	() => {
		it(
			'creates an independent mutable copy of nested markings',
			() => {
				const accepted:
					NormalizedContentTextMarkupMap = {
						'paragraph-1': {
							2: {
								class: [
									'bg-highlighta'
								]
							}
						}
					};

				const draft =
					cloneNormalizedContentTextMarkupMap(
						accepted
					);

				draft['paragraph-1']['2'].class.push(
					'text-highlightb'
				);

				expect(draft).toEqual({
					'paragraph-1': {
						2: {
							class: [
								'bg-highlighta',
								'text-highlightb'
							]
						}
					}
				});

				expect(accepted).toEqual({
					'paragraph-1': {
						2: {
							class: [
								'bg-highlighta'
							]
						}
					}
				});
			}
		);

		it(
			'preserves prototype-like block IDs as own properties',
			() => {
				const accepted:
					NormalizedContentTextMarkupMap = {};

				Object.defineProperty(
					accepted,
					'__proto__',
					{
						configurable: true,
						enumerable: true,
						writable: true,
						value: {
							0: {
								class: [
									'bg-highlightc'
								]
							}
						}
					}
				);

				const draft =
					cloneNormalizedContentTextMarkupMap(
						accepted
					);

				expect(
					Object.prototype.hasOwnProperty.call(
						draft,
						'__proto__'
					)
				).toBe(true);

				expect(
					draft['__proto__']['0']
				).toEqual({
					class: [
						'bg-highlightc'
					]
				});

				expect(
					Object.getPrototypeOf(draft)
				).toBe(
					Object.prototype
				);
			}
		);
	}
);


describe('hasNormalizedContentTextMarkupDraftChanges', () => {
	it('skips unchanged and reverted edits, including empty marking placeholders', () => {
		const accepted: NormalizedContentTextMarkupMap = {};
		const draft: NormalizedContentTextMarkupMap = {
			paragraph: { '0': { class: [] } }
		};
		expect(hasNormalizedContentTextMarkupDraftChanges(accepted, draft)).toBe(false);
		const updated: NormalizedContentTextMarkupMap = {
			paragraph: { '0': { class: ['bg-highlighta'] } }
		};
		expect(hasNormalizedContentTextMarkupDraftChanges(updated, draft)).toBe(true);
		expect(hasNormalizedContentTextMarkupDraftChanges(draft, updated)).toBe(true);
	});

	it('detects added, removed, and changed presentation classes', () => {
		const accepted: NormalizedContentTextMarkupMap = {
			paragraph: { '0': { class: ['bg-highlighta'] } }
		};
		expect(hasNormalizedContentTextMarkupDraftChanges(accepted,
			cloneNormalizedContentTextMarkupMap(accepted))).toBe(false);
		expect(hasNormalizedContentTextMarkupDraftChanges(accepted,
			{ paragraph: { '0': { class: ['bg-highlightb'] } } })).toBe(true);
		expect(hasNormalizedContentTextMarkupDraftChanges(accepted, {})).toBe(true);
		expect(hasNormalizedContentTextMarkupDraftChanges(accepted,
			{ paragraph: { '0': { class: ['bg-highlighta', 'underline'] } } })).toBe(true);
	});

	it('compares prototype-like canonical block IDs as own keys', () => {
		const draft: NormalizedContentTextMarkupMap = {};
		Object.defineProperty(draft, '__proto__', {
			enumerable: true, configurable: true, writable: true,
			value: { '0': { class: ['bg-highlighta'] } }
		});
		expect(hasNormalizedContentTextMarkupDraftChanges({}, draft)).toBe(true);
		expect(hasNormalizedContentTextMarkupDraftChanges(
			cloneNormalizedContentTextMarkupMap(draft), draft)).toBe(false);
	});
});
