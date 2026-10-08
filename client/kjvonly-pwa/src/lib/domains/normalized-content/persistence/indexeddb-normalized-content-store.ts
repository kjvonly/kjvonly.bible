import {
	NORMALIZED_DOCUMENT_OBJECT_TYPE
} from '../models/normalized-document-id';

import type {
	NormalizedDocument
} from '@kjvonly/normalized-content';

import {
	NORMALIZED_DOCUMENT_DATA_TYPE,
	NORMALIZED_DOCUMENT_DATA_VERSION
} from '../resources/normalized-content-resource-contract';

import type {
	NormalizedContentStore
} from './normalized-content-store';

import {
	DOMAIN_OBJECTS,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

export class IndexedDBNormalizedContentStore
	implements NormalizedContentStore {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async get(
		id: string
	): Promise<
		NormalizedDocument |
		undefined
	> {
		const db =
			await this.getDB();

		const stored =
			await db.get(
				DOMAIN_OBJECTS,
				createStoredDomainObjectId(
					NORMALIZED_DOCUMENT_OBJECT_TYPE,
					id
				)
			);

		if (stored === undefined) {
			return undefined;
		}

		return stored.value as
			NormalizedDocument;
	}

	async put(
		id: string,
		document: NormalizedDocument
	): Promise<void> {
		const db =
			await this.getDB();

		const stored:
			StoredDomainObject = {
				id:
					createStoredDomainObjectId(
						NORMALIZED_DOCUMENT_OBJECT_TYPE,
						id
					),

				objectType:
					NORMALIZED_DOCUMENT_OBJECT_TYPE,

				dataType:
					NORMALIZED_DOCUMENT_DATA_TYPE,

				dataVersion:
					NORMALIZED_DOCUMENT_DATA_VERSION,

				objectId:
					id,

				value:
					document
			};

		await db.put(
			DOMAIN_OBJECTS,
			stored
		);
	}
}
