import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BibleTextMarkup
} from '$lib/domains/bible/models/bible-text-markup.model';

import {
	BibleTextMarkupResourcePublication
} from './bible-text-markup-resource-publication';

describe(
	'BibleTextMarkupResourcePublication',
	() => {
		it(
			'derives the exact Resource publication identity from the Domain Object identity',
			() => {
				const publication =
					new BibleTextMarkupResourcePublication()
						.create(
							createTextMarkup()
						);

				expect(
					publication
				).toEqual({
					publisher:
						'publisher',

					resourceType:
						'kjvonly/overlays/text-markup',

					resourceId:
						'kjvonly/overlays/text-markup/kjvs/1_1',

					representation:
						'content',

					mediaType:
						'application/json+gzip+hex',

					value:
						createTextMarkup().markings
				});

				expect(
					publication
				).not.toHaveProperty(
					'id'
				);
			}
		);

		it(
			'derives the publisher from the Domain Object rather than the current user or a selected Resource',
			() => {
				const publication =
					new BibleTextMarkupResourcePublication()
						.create({
							...createTextMarkup(),
							id:
								'other-publisher/study/1_1'
						});

				expect(
					publication.publisher
				).toBe(
					'other-publisher'
				);

				expect(
					publication.resourceId
				).toBe(
					'kjvonly/overlays/text-markup/study/1_1'
				);
			}
		);

		it(
			'rejects a Domain Object whose chapter does not match its application identity',
			() => {
				expect(
					() =>
						new BibleTextMarkupResourcePublication()
							.create({
								...createTextMarkup(),
								chapterRef:
									'1_2'
							})
				).toThrow(
					'Bible Text Markup chapter does not match Domain identity'
				);
			}
		);

		it(
			'rejects an invalid application identity',
			() => {
				expect(
					() =>
						new BibleTextMarkupResourcePublication()
							.create({
								...createTextMarkup(),
								id:
									'publisher/1_1'
							})
				).toThrow(
					'Invalid Bible Text Markup id'
				);
			}
		);
	}
);

function createTextMarkup(): BibleTextMarkup {
	return {
		id:
			'publisher/kjvs/1_1',

		chapterRef:
			'1_1',

		markings: {
			'1': {
				'0': {
					class: [
						'bg-highlighta'
					]
				}
			}
		}
	};
}
