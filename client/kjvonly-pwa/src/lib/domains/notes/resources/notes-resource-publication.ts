import type {
	Note
} from '$lib/domains/notes/models/note.model';

import {
	parseNoteId
} from '$lib/domains/notes/models/note-id';

import type {
	ResourcePublication
} from '$lib/resource/publication/resource-publication';

import {
	NOTES_RESOURCE_TYPE
} from './note-interpreter';

export class NotesResourcePublication {

	create(
		note: Note
	): ResourcePublication {
		const {
			publisher,
			name,
			noteId
		} = parseNoteId(
			note.id
		);

		return {
			publisher,

			resourceType:
				NOTES_RESOURCE_TYPE,

			resourceId:
				`${NOTES_RESOURCE_TYPE}/${name}/${noteId}`,

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
