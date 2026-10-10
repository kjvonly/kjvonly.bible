import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	NormalizedContentTextMarkup
} from '../models/normalized-content-text-markup.model';

import {
	NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE
} from '../models/normalized-content-text-markup.model';

import {
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION
} from '../resources/text-markup/normalized-content-text-markup-resource';

import {
	DOMAIN_OBJECTS,
	createStoredDomainObjectId,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	IndexedDBNormalizedContentTextMarkupStore
} from './indexeddb-normalized-content-text-markup-store';

describe(
	'IndexedDBNormalizedContentTextMarkupStore',
	() => {
		it(
			'gets Text Markup from the shared Domain Object store',
			async () => {
				const textMarkup =
					createTextMarkup();

				const get =
					vi.fn()
						.mockResolvedValue({
							id:
								createStoredDomainObjectId(
									NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
									textMarkup.id
								),
							objectType:
								NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
							dataType:
								NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,
							dataVersion:
								NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION,
							objectId:
								textMarkup.id,
							value:
								textMarkup
						});

				const store =
					createStore({
						get
					});

				await expect(
					store.get(
						textMarkup.id
					)
				).resolves.toEqual(
					textMarkup
				);

				expect(
					get
				).toHaveBeenCalledWith(
					DOMAIN_OBJECTS,
					createStoredDomainObjectId(
						NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
						textMarkup.id
					)
				);
			}
		);

		it(
			'puts Text Markup in the shared Domain Object envelope',
			async () => {
				const put =
					vi.fn()
						.mockResolvedValue(
							undefined
						);

				const store =
					createStore({
						put
					});

				const textMarkup =
					createTextMarkup();

				await store.put(
					textMarkup
				);

				expect(
					put
				).toHaveBeenCalledWith(
					DOMAIN_OBJECTS,
					{
						id:
							createStoredDomainObjectId(
								NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
								textMarkup.id
							),
						objectType:
							NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
						dataType:
							NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,
						dataVersion:
							NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION,
						objectId:
							textMarkup.id,
						value:
							textMarkup
					}
				);
			}
		);
	}
);

function createStore(
	db: Partial<ApplicationDB>
): IndexedDBNormalizedContentTextMarkupStore {
	return new IndexedDBNormalizedContentTextMarkupStore(
		async () =>
			db as ApplicationDB
	);
}

function createTextMarkup():
	NormalizedContentTextMarkup {
	return {
		id:
			'markup-publisher/document-publisher/articles%2Fsermon/42',

		document: {
			publisher:
				'document-publisher',
			resourceId:
				'articles/sermon',
			modifiedAt:
				42
		},

		markings: {
			'paragraph-1': {
				'3': {
					class: [
						'bg-highlighta'
					]
				}
			}
		}
	};
}
