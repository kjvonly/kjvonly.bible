import type {
	Note
} from '../models/note.model';

import {
	parseNoteId
} from '../models/note-id';

import type {
	ResourceDeletionPublication,
	ResourcePublication
} from '$lib/resource';

import {
	NOTE_DATA_TYPE,
	NOTE_DATA_VERSION,
	NOTES_RESOURCE_TYPE
} from './notes-resource-contract';

import {
	createNotesResourceId
} from './notes-resource-id';

export class NotesResourcePublication {

	create(
		note: Note
	): ResourcePublication {
		const identity =
			this.createResourceIdentity(
				note.id
			);

		return {
			type:
				'resource',

			...identity,

			dataType:
				NOTE_DATA_TYPE,

			dataVersion:
				NOTE_DATA_VERSION,

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
			type:
				'resource',

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
				createNotesResourceId(
					name,
					resourceNoteId
				)
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
