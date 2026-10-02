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
	NOTE_DATA_TYPE_V1,
	NOTES_RESOURCE_TYPE
} from './notes-resource-contract';

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

			representation:
				'content',

			mediaType:
				'application/json+gzip+hex',

			metadata: {
				dataType:
					NOTE_DATA_TYPE_V1
			},

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
