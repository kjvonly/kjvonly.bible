import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NormalizedContentTextMarkupMap
} from '../../models/normalized-content-text-markup.model';

import {
	cloneNormalizedContentTextMarkupMap
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
