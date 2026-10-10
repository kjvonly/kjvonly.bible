import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NormalizedContentTextMarkup
} from '../../models/normalized-content-text-markup.model';

import {
	createNormalizedContentTextMarkupId
} from '../../models/normalized-content-text-markup.model';

import {
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION,
	NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_TYPE,
	createNormalizedContentTextMarkupResourceId
} from './normalized-content-text-markup-resource';

import {
	NormalizedContentTextMarkupResourcePublication
} from './normalized-content-text-markup-resource-publication';

describe(
	'NormalizedContentTextMarkupResourcePublication',
	() => {
		it(
			'publishes only the markings payload for the identity target snapshot',
			() => {
				const document = {
					publisher:
						'document-publisher',
					resourceId:
						'kjvonly/sermons/sermon-1',
					modifiedAt:
						42
				} as const;

				const markings = {
					'paragraph-1': {
						'2': {
							class: [
								'bg-highlighta'
							]
						}
					}
				};

				const textMarkup:
					NormalizedContentTextMarkup = {
						id:
							createNormalizedContentTextMarkupId(
								'markup-publisher',
								document.publisher,
								document.resourceId,
								document.modifiedAt
							),
						document,
						markings
					};

				expect(
					new NormalizedContentTextMarkupResourcePublication()
						.create(
							textMarkup
						)
				).toEqual({
					type:
						'resource',
					publisher:
						'markup-publisher',
					resourceType:
						NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_TYPE,
					dataType:
						NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,
					dataVersion:
						NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION,
					resourceId:
						createNormalizedContentTextMarkupResourceId(
							document.publisher,
							document.resourceId,
							document.modifiedAt
						),
					representation:
						'content',
					mediaType:
						'application/json+gzip+hex',
					value:
						markings
				});
			}
		);

		it.each([
			{
				publisher:
					'other-document-publisher',
				resourceId:
					'kjvonly/sermons/sermon-1',
				modifiedAt:
					42
			},
			{
				publisher:
					'document-publisher',
				resourceId:
					'other-resource',
				modifiedAt:
					42
			},
			{
				publisher:
					'document-publisher',
				resourceId:
					'kjvonly/sermons/sermon-1',
				modifiedAt:
					43
			}
		])(
			'rejects a document reference that disagrees with Domain identity',
			(document) => {
				const textMarkup:
					NormalizedContentTextMarkup = {
						id:
							createNormalizedContentTextMarkupId(
								'markup-publisher',
								'document-publisher',
								'kjvonly/sermons/sermon-1',
								42
							),
						document,
						markings: {}
					};

				expect(
					() =>
						new NormalizedContentTextMarkupResourcePublication()
							.create(
								textMarkup
							)
				).toThrow(
					`Normalized Content Text Markup document does not match Domain identity: ${textMarkup.id}`
				);
			}
		);
	}
);
