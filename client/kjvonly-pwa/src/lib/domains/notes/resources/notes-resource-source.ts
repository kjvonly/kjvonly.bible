import type {
	PublishedResourceReference
} from '$lib/resource';

import {
	parseResourceIdentifier
} from '$lib/resource';

import {
	createNoteId
} from '../models/note-id';

import {
	NOTES_RESOURCE_TYPE
} from './note-interpreter';

export interface NotesResourceSource {
	readonly name:
		string;
}

export function parseNotesResourceSource(
	source:
		PublishedResourceReference
): NotesResourceSource {
	const identifier =
		parseResourceIdentifier(
			source.resourceId
		);

	if (
		identifier.resourceType !==
		NOTES_RESOURCE_TYPE
	) {
		throw new Error(
			`Invalid Notes Resource Type: ${identifier.resourceType}`
		);
	}

	if (
		identifier.path.length !==
		1
	) {
		throw new Error(
			`Invalid Notes Resource source: ${source.resourceId}`
		);
	}

	return {
		name:
			identifier.path[0]
	};
}

export function createNoteIdForSource(
	source:
		PublishedResourceReference,
	noteId: string
): string {
	const {
		name
	} = parseNotesResourceSource(
		source
	);

	return createNoteId(
		source.publisher,
		name,
		noteId
	);
}
