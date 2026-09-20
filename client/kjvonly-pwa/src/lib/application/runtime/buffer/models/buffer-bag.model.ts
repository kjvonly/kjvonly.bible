import type {
	Word
} from '$lib/domains/bible';

import type {
	NavReadings
} from '$lib/domains/reading-plans';

/**
 * Bible navigation state that can survive Buffer replacement and persistence.
 */
export interface BibleBufferBag {
	bibleLocationRef?: string;
}

/**
 * Notes navigation state carried between the notes list and an opened note.
 */
export interface NotesBufferBag {
	noteID?: string;
}

/**
 * Reference/Strong's context created from a Bible word or verse selection.
 */
export interface ReferencesBufferBag {
	word?: Word;
	footnotes?: Record<string, string>;
	currentVerseRef?: string;
	refs?: string[];
	strongsWords?: string[];
}

/**
 * Reading-plan navigation state carried through the Bible module and back into
 * the plans module.
 */
export interface ReadingPlansBufferBag {
	navReadings?: NavReadings;
}

/**
 * Persisted navigation context associated with a Buffer.
 *
 * Buffer replacement intentionally preserves this object when a caller does
 * not provide a replacement bag, so context from more than one module can be
 * present at the same time. The intersection models that accumulated context
 * more accurately than a module-discriminated union would.
 *
 * Unknown properties remain allowed for persisted-state compatibility while
 * all navigation fields currently consumed by the application are typed.
 */
export type BufferBag =
	BibleBufferBag &
	NotesBufferBag &
	ReferencesBufferBag &
	ReadingPlansBufferBag &
	Record<string, unknown>;
