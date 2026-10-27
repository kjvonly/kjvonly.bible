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

import type {
	NormalizedContentTextMarkupStore
} from './normalized-content-text-markup-store';

import {
	DOMAIN_OBJECTS,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

/** IndexedDB-backed storage for accepted Normalized Content Text Markup. */
export class IndexedDBNormalizedContentTextMarkupStore
	implements NormalizedContentTextMarkupStore {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async get(
		id: string
	): Promise<
		NormalizedContentTextMarkup |
		undefined
	> {
		const db =
			await this.getDB();

		const stored =
			await db.get(
				DOMAIN_OBJECTS,
				createStoredDomainObjectId(
					NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
					id
				)
			);

		return stored?.value as
			NormalizedContentTextMarkup |
			undefined;
	}

	async put(
		textMarkup:
			NormalizedContentTextMarkup
	): Promise<void> {
		const db =
			await this.getDB();

		const stored:
			StoredDomainObject = {
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
			};

		await db.put(
			DOMAIN_OBJECTS,
			stored
		);
	}
}
