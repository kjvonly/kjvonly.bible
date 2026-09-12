import FlexSearch from 'flexsearch';

import {
	bibleLocationReferenceService
} from '$lib/domains/bible/services/bibleLocationReference.service';

import type {
	Note,
	NotesById
} from '$lib/domains/notes/models/note.model';

import type {
	NotesSearchWorkerRequest
} from '$lib/domains/notes/runtime/search/notes-search-worker-message';

type IndexedNote = Note & {
	bookChapter?: string;
};

function createNotesDocument() {
	return new FlexSearch.Document({
		document: {
			id: 'id',
			index: [
				'title',
				'text',
				'tags[]:tag',
				'bookChapter',
				'bibleLocationRef'
			]
		}
	});
}

let notesDocument =
	createNotesDocument();

let notes:
	Record<string, IndexedNote> =
	{};

async function initialize(
	acceptedNotes: Note[]
): Promise<void> {
	notesDocument =
		createNotesDocument();

	notes = {};

	for (
		const acceptedNote of acceptedNotes
	) {
		const note =
			createIndexedNote(
				acceptedNote
			);

		await notesDocument.addAsync(
			note.id,
			note
		);

		notes[note.id] =
			note;
	}

	getAllNotes('*');
}

function createIndexedNote(
	note: Note
): IndexedNote {
	if (!note.bibleLocationRef) {
		return {
			...note
		};
	}

	return {
		...note,
		bookChapter:
			bibleLocationReferenceService
				.extractBookIDChapter(
					note.bibleLocationRef
				)
	};
}

function putNote(
	note: Note
): void {
	const indexedNote =
		createIndexedNote(
			note
		);

	notes[note.id] =
		indexedNote;

	notesDocument.add(
		note.id,
		indexedNote
	);

	getAllNotes('*');
}

function removeNote(
	noteId: string
): void {
	delete notes[noteId];

	notesDocument.remove(
		noteId
	);

	getAllNotes('*');
}

async function searchNotes(
	id: string,
	searchTerm: string,
	indexes: string[]
): Promise<void> {
	const results =
		await notesDocument.searchAsync(
			searchTerm,
			{
				index: indexes
			}
		);

	const filteredNotes:
		NotesById =
		{};

	results.forEach(
		(result) => {
			result.result.forEach(
				(noteId) => {
					const note =
						notes[String(noteId)];

					if (note) {
						filteredNotes[String(noteId)] =
							note;
					}
				}
			);
		}
	);

	if (
		Object.keys(
			filteredNotes
		).length > 0
	) {
		postMessage({
			id,
			notes: filteredNotes
		});
	}
}

function getAllNotes(
	id: string
): void {
	postMessage({
		id,
		notes
	});
}

onmessage = async (
	e: MessageEvent<NotesSearchWorkerRequest>
) => {
	switch (e.data.action) {
		case 'initialize':
			await initialize(
				e.data.notes
			);
			break;

		case 'put':
			putNote(
				e.data.note
			);
			break;

		case 'remove':
			removeNote(
				e.data.noteId
			);
			break;

		case 'search':
			await searchNotes(
				e.data.id,
				e.data.text,
				e.data.indexes
			);
			break;

		case 'get-all':
			getAllNotes(
				e.data.id
			);
			break;
	}
};
