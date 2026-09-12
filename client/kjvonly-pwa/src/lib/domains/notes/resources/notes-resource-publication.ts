import type {
	Note
} from '$lib/domains/notes/models/note.model';

import {
	parseNoteId
} from '$lib/domains/notes/models/note-id';

import type {
	ResourceDeletionPublication,
	ResourcePublication
} from '$lib/resource/publication/resource-publication';

import {
	NOTES_RESOURCE_TYPE
} from './note-interpreter';

export class NotesResourcePublication {

	create(
		note: Note
	): ResourcePublication {
		const identity =
			this.createResourceIdentity(
				note.id
			);

		return {
			...identity,

			representation:
				'content',

			mediaType:
				'application/json+gzip+hex',

			value:
				createResourceValue(
					note
				)
		};
	}

	createDeletion(
		noteId: string
	): ResourceDeletionPublication {
		return {
			operation:
				'delete',

			...this.createResourceIdentity(
				noteId
			)
		};
	}

	private createResourceIdentity(
		noteId: string
	): {
		readonly publisher: string;
		readonly resourceType: string;
		readonly resourceId: string;
	} {
		const {
			publisher,
			name,
			noteId: resourceNoteId
		} = parseNoteId(
			noteId
		);

		return {
			publisher,

			resourceType:
				NOTES_RESOURCE_TYPE,

			resourceId:
				`${NOTES_RESOURCE_TYPE}/${name}/${resourceNoteId}`
		};
	}
}

function createResourceValue(
	note: Note
): Omit<Note, 'id'> {
	return {
		bibleLocationRef:
			note.bibleLocationRef,

		bibleReferenceText:
			note.bibleReferenceText,

		text:
			note.text,

		html:
			note.html,

		title:
			note.title,

		dateCreated:
			note.dateCreated,

		dateUpdated:
			note.dateUpdated,

		tags:
			note.tags
	};
}
