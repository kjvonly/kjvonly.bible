import type {
	Strongs
} from '$lib/domains/strongs/models/strongs.model';

import type {
	StrongsStore
} from './strongs-store';

import {
	DOMAIN_OBJECTS,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

export const STRONGS_DEFINITION_OBJECT_TYPE =
	'strongs/definition';

export class IndexedDBStrongsStore
	implements StrongsStore {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async get(
		id: string
	): Promise<
		Strongs |
		undefined
	> {
		const db =
			await this.getDB();

		const stored =
			await db.get(
				DOMAIN_OBJECTS,
				createStoredDomainObjectId(
					STRONGS_DEFINITION_OBJECT_TYPE,
					id
				)
			);

		return stored?.value as
			| Strongs
			| undefined;
	}

	async put(
		strongs: Strongs
	): Promise<void> {
		const db =
			await this.getDB();

		const stored:
			StoredDomainObject = {
				id:
					createStoredDomainObjectId(
						STRONGS_DEFINITION_OBJECT_TYPE,
						strongs.id
					),

				objectType:
					STRONGS_DEFINITION_OBJECT_TYPE,

				objectId:
					strongs.id,

				value:
					strongs
			};

		await db.put(
			DOMAIN_OBJECTS,
			stored
		);
	}
}