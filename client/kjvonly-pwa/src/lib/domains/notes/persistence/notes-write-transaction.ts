import type {
	Note
} from '$lib/domains/notes/models/note.model';

import {
	NOTE_OBJECT_TYPE
} from './notes-store';

import type {
	NotesWriteStores,
	NotesWriteTransaction
} from '$lib/domains/notes/resources/notes-write-stores';

import {
	createPendingResourcePublication
} from '$lib/resource/outbox/outbox-entry';

import {
	DOMAIN_OBJECTS,
	OUTBOX,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

export class IndexedDBNotesWriteTransaction
	implements NotesWriteTransaction {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async run<TResult>(
		operation:
			(
				stores:
					NotesWriteStores
			) => Promise<TResult>
	): Promise<TResult> {
		const db =
			await this.getDB();

		const transaction =
			db.transaction(
				[
					DOMAIN_OBJECTS,
					OUTBOX
				],
				'readwrite'
			);

		const domainObjects =
			transaction.objectStore(
				DOMAIN_OBJECTS
			);

		const outbox =
			transaction.objectStore(
				OUTBOX
			);

		const stores:
			NotesWriteStores = {
				notes: {
					put:
						async (
							note
						) => {
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

							await domainObjects.put(
								stored
							);
						}
				},

				outbox: {
					put:
						async (
							objectId,
							resource
						) => {
							const storedId =
								createStoredDomainObjectId(
									NOTE_OBJECT_TYPE,
									objectId
								);

							await outbox.put(
								createPendingResourcePublication(
									storedId,
									resource
								)
							);
						}
				}
			};

		try {
			const result =
				await operation(
					stores
				);

			await transaction.done;

			return result;
		} catch (error) {
			try {
				transaction.abort();
			} catch {
				// Transaction may already be inactive.
			}

			try {
				await transaction.done;
			} catch {
				// Preserve the original operation error.
			}

			throw error;
		}
	}
}
