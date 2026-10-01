import type {
	PublishedResourceReference,
	ResourceDescriptor
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

/**
 * Creates the Domain Note id represented by one individual Notes descriptor.
 *
 * Filesystem and other catalog layers may discover the descriptor, but Notes
 * remains responsible for translating the Resource identity into its own
 * Domain object identity.
 */
export function createNoteIdForDescriptor(
	descriptor:
		ResourceDescriptor
): string {
	if (
		descriptor.metadata.category !==
		NOTES_RESOURCE_TYPE
	) {
		throw new Error(
			`Invalid Notes Resource Type: ${descriptor.metadata.category}`
		);
	}

	const identifier =
		parseResourceIdentifier(
			descriptor.metadata.resourceId
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
		2
	) {
		throw new Error(
			`Invalid individual Notes Resource: ${descriptor.metadata.resourceId}`
		);
	}

	const [
		name,
		noteId
	] = identifier.path;

	return createNoteId(
		descriptor.metadata.publisher,
		name,
		noteId
	);
}
