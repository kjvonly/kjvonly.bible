import type {
	NotesById
} from '$lib/domains/notes/models/note.model';

import type {
	NotesSearchResult
} from './notes-search-worker-message';

export interface NotesSearchIndexResult {
	readonly result:
		readonly (string | number)[];
}

/**
 * Builds the Notes search response from FlexSearch document matches.
 *
 * An empty match set is still a valid response. Callers use it to clear a
 * previous search result when the current query has no matches.
 */
export function createNotesSearchResult(
	id: string,
	results:
		readonly NotesSearchIndexResult[],
	notes:
		Readonly<NotesById>
): NotesSearchResult {
	const filteredNotes:
		NotesById =
		{};

	for (const result of results) {
		for (const noteId of result.result) {
			const key =
				String(noteId);

			const note =
				notes[key];

			if (note) {
				filteredNotes[key] =
					note;
			}
		}
	}

	return {
		id,
		notes: filteredNotes
	};
}
