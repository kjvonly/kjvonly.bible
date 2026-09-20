import type {
	NotesById
} from '$lib/domains/notes/models/note.model';

export type ChapterNotesByLocation =
	Record<
		string,
		true
	>;

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
