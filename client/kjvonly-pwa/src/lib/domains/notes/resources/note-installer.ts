import type {
	Note
} from '$lib/domains/notes/models/note.model';

import {
	createNoteId
} from '$lib/domains/notes/models/note-id';

import {
	NOTE_OBJECT_TYPE
} from '$lib/domains/notes/persistence/notes-store';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource/installation/resource-installation';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	NotesInstallationTransaction
} from './notes-installation-stores';

import type {
	ValidatedNoteCandidate
} from './validated-note-candidate';

export class NoteInstaller {

	constructor(
		private readonly transaction:
			NotesInstallationTransaction
	) {}

	async install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedNoteCandidate[]
	): Promise<void> {
		if (
			candidates.length ===
			0
		) {
			return;
		}

		const name =
			candidates[0].name;

		for (
			const candidate of candidates
		) {
			if (
				candidate.name !==
				name
			) {
				throw new Error(
					'Notes Resource contains multiple names.'
				);
			}
		}

		await this.transaction.run(
			async (
				stores
			) => {
				for (
					const candidate of candidates
				) {
					const noteId =
						createNoteId(
							resource.publisher,
							name,
							candidate.noteId
						);

					const existing =
						await stores.notes.get(
							noteId
						);

					if (existing) {
						continue;
					}

					const note:
						Note = {
							id:
								noteId,

							...candidate.note
						};

					const installation:
						ResourceInstallation = {
							id:
								createResourceInstallationId(
									NOTE_OBJECT_TYPE,
									noteId
								),

							objectType:
								NOTE_OBJECT_TYPE,

							objectId:
								noteId,

							publisher:
								resource.publisher,

							resourceId:
								resource.resourceId,

							modifiedAt:
								resource.modifiedAt
						};

					await stores.notes.put(
						note
					);

					await stores
						.resourceInstallations
						.put(
							installation
						);
				}
			}
		);
	}
}
