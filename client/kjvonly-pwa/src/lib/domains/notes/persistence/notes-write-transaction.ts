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
	createPendingPublication
} from '$lib/application';

import {
	isResourceDeletionPublication
} from '$lib/resource';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	OUTBOX,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

export class IndexedDBNotesWriteTransaction
	implements NotesWriteTransaction {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>,

		private readonly nowEpochSeconds:
			() => number =
				() => Math.floor(
					Date.now() / 1000
				)
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
					RESOURCE_INSTALLATIONS,
					OUTBOX
				],
				'readwrite'
			);

		const domainObjects =
			transaction.objectStore(
				DOMAIN_OBJECTS
			);

		const resourceInstallations =
			transaction.objectStore(
				RESOURCE_INSTALLATIONS
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
						},

					delete:
						async (
							id
						) => {
							await domainObjects.delete(
								createStoredDomainObjectId(
									NOTE_OBJECT_TYPE,
									id
								)
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

							const existing =
								await resourceInstallations.get(
									storedId
								);

							const modifiedAt =
								Math.max(
									this.nowEpochSeconds(),
									(existing?.modifiedAt ?? 0) + 1
								);

							if (
								isResourceDeletionPublication(
									resource
								)
							) {
								await resourceInstallations.delete(
									storedId
								);
							} else {
								await resourceInstallations.put({
									id:
										storedId,
									objectType:
										NOTE_OBJECT_TYPE,
									objectId,
									publisher:
										resource.publisher,
									modifiedAt
								});
							}

							await outbox.put(
								createPendingPublication(
									storedId,
									{
										...resource,
										modifiedAt
									}
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
