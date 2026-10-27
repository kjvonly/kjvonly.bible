import type {
	NotesById
} from '$lib/domains/notes';

/** Exact Bible-location membership lookup used by Reader token rendering. */
export type ChapterNotesByLocation =
	Record<
		string,
		true
	>;

/**
 * Projects chapter-scoped Notes into an exact-location membership lookup.
 *
 * The Reader only needs to know whether an inline Note affordance exists at a
 * location; Note content and editing remain owned by the Notes domain.
 *
 * @param notes - Notes returned by the chapter-scoped Notes search.
 * @returns Exact Bible-location keys that currently have one or more Notes.
 */
export function createChapterNotesByLocation(
	notes: NotesById
): ChapterNotesByLocation {
	const result: ChapterNotesByLocation = {};

	for (const note of Object.values(notes)) {
		if (!note.bibleLocationRef) {
			continue;
		}

		result[note.bibleLocationRef] = true;
	}

	return result;
}
