import type {
	Note,
	NotesById
} from '../models/note.model';
import {
	NOTES_BIBLE_SCOPE_KINDS,
	type NotesBibleScope
} from '../models/notes-navigation.model';


interface BibleBookChapterExtractor {
	extractBookIDChapter(ref: string): string;
}

/**
 * Filters installed Notes according to the explicit Bible Notes scope.
 *
 * Exact scope preserves the legacy exact-reference behavior. Chapter scope
 * compares parsed `bookID_chapter` identity so chapter-, verse-, and word-level
 * Notes in the chapter are included without relying on raw string prefixes.
 *
 * @param notes - Installed Notes keyed by Note ID.
 * @param bibleScope - Optional explicit Notes Bible scope.
 * @param bibleLocationReferenceService - Bible location identity parser.
 * @returns Notes that belong to the requested scope.
 */
export function filterNotesByBibleScope(
	notes: NotesById,
	bibleScope: NotesBibleScope | undefined,
	bibleLocationReferenceService: BibleBookChapterExtractor
): NotesById {
	if (!bibleScope) {
		return {
			...notes
		};
	}

	if (
		bibleScope.kind ===
		NOTES_BIBLE_SCOPE_KINDS.EXACT
	) {
		return filterNotes(
			notes,
			(note) =>
				note.bibleLocationRef ===
				bibleScope.bibleLocationRef
		);
	}

	const bookIDChapter =
		bibleLocationReferenceService
			.extractBookIDChapter(
				bibleScope.bibleLocationRef
			);

	return filterNotes(
		notes,
		(note) =>
			belongsToChapter(
				note,
				bookIDChapter,
				bibleLocationReferenceService
			)
	);
}

/** Treats malformed or missing Bible locations as outside chapter scope. */
function belongsToChapter(
	note: Note,
	bookIDChapter: string,
	bibleLocationReferenceService: BibleBookChapterExtractor
): boolean {
	if (!note.bibleLocationRef) {
		return false;
	}

	try {
		return (
			bibleLocationReferenceService
				.extractBookIDChapter(
					note.bibleLocationRef
				) === bookIDChapter
		);
	} catch {
		return false;
	}
}

/** Preserves the Notes-by-ID shape while applying one scope predicate. */
function filterNotes(
	notes: NotesById,
	predicate: (note: Note) => boolean
): NotesById {
	return Object.fromEntries(
		Object.entries(notes).filter(
			([, note]) =>
				predicate(note)
		)
	);
}
