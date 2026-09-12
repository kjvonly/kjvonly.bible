import type {
	Note
} from '$lib/domains/notes/models/note.model';

import {
	NOTE_OBJECT_TYPE,
	type NotesStore
} from './notes-store';

import {
	DOMAIN_OBJECTS,
	OBJECT_TYPE_INDEX,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

export class IndexedDBNotesStore
	implements NotesStore {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async get(
		id: string
	): Promise<
		Note |
		undefined
	> {
		const db =
			await this.getDB();

		const stored =
			await db.get(
				DOMAIN_OBJECTS,
				createStoredDomainObjectId(
					NOTE_OBJECT_TYPE,
					id
				)
			);

		return stored?.value as
			Note |
			undefined;
	}

	async getAll(): Promise<
		readonly Note[]
	> {
		const db =
			await this.getDB();

		const stored =
			await db.getAllFromIndex(
				DOMAIN_OBJECTS,
				OBJECT_TYPE_INDEX,
				NOTE_OBJECT_TYPE
			);

		return stored.map(
			(object) =>
				object.value as Note
		);
	}

	async put(
		note: Note
	): Promise<void> {
		const db =
			await this.getDB();

		const stored:
			StoredDomainObject = {
				id:
					createStoredDomainObjectId(
						NOTE_OBJECT_TYPE,
						note.id
					),

				objectType:
					NOTE_OBJECT_TYPE,

				objectId:
					note.id,

				value:
					note
			};

		await db.put(
			DOMAIN_OBJECTS,
			stored
		);
	}
}
