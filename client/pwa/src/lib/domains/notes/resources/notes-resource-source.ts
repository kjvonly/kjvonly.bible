import type {
	PublishedResourceReference,
	ResourceDescriptor
} from '$lib/resource';

import {
	createNoteId
} from '../models/note-id';

import {
	NOTES_RESOURCE_TYPE
} from './notes-resource-contract';

import {
	parseNotesResourceId
} from './notes-resource-id';

export interface NotesResourceSource {
	readonly name:
		string;
}

export function parseNotesResourceSource(
	source:
		PublishedResourceReference
): NotesResourceSource {
	const identity =
		parseNotesResourceId(
			source.resourceId
		);

	if (
		identity.noteId !==
			undefined
	) {
		throw new Error(
			`Invalid Notes Resource source: ${source.resourceId}`
		);
	}

	return {
		name:
			identity.name
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

/**
 * Creates the Domain Note id represented by one individual Notes descriptor.
 *
 * Filesystem and other catalog layers may discover the descriptor, but Notes
 * remains responsible for translating the Resource ID into its own
 * Domain object identity.
 */
export function createNoteIdForDescriptor(
	descriptor:
		ResourceDescriptor
): string {
	if (
		descriptor.metadata.resourceType !==
		NOTES_RESOURCE_TYPE
	) {
		throw new Error(
			`Invalid Notes Resource Type: ${descriptor.metadata.resourceType}`
		);
	}

	const identity =
		parseNotesResourceId(
			descriptor.metadata.resourceId
		);

	if (
		identity.noteId ===
			undefined
	) {
		throw new Error(
			`Invalid individual Notes Resource: ${descriptor.metadata.resourceId}`
		);
	}

	return createNoteId(
		descriptor.metadata.publisher,
		identity.name,
		identity.noteId
	);
}
