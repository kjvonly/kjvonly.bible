import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	Note
} from '$lib/domains/notes/models/note.model';

import {
	NotesService
} from '$lib/domains/notes/services/notes.service';

import type {
	NotesSearchResult
} from '$lib/domains/notes/runtime/search/notes-search-worker-message';

function createNote(
	id: string =
		'publisher/default/note-1'
): Note {
	return {
		id,
		bibleLocationRef:
			undefined,
		bibleReferenceText:
			undefined,
		title: 'Title',
		text: 'Text',
		html: '<p>Text</p>',
		dateCreated: 1,
		dateUpdated: 2,
		tags: []
	};
}

class FakeNotesStore {
	getAll =
		vi.fn<() => Promise<readonly Note[]>>();
}

class FakeRuntime {
	setResultHandler =
		vi.fn<(handler: (response: NotesSearchResult) => void) => void>();

	initialize =
		vi.fn<(notes: Note[]) => void>();

	search =
		vi.fn<(id: string, text: string, indexes: string[]) => void>();

	getAll =
		vi.fn<(id: string) => void>();

	put =
		vi.fn<(note: Note) => void>();

	remove =
		vi.fn<(noteId: string) => void>();
}

describe(
	'NotesService',
	() => {
		it(
			'loads accepted Notes from the Domain store into the search runtime',
			async () => {
				const store =
					new FakeNotesStore();

				const runtime =
					new FakeRuntime();

				const note =
					createNote();

				store.getAll
					.mockResolvedValue([
						note
					]);

				const service =
					new NotesService(
						store,
						runtime
					);

				service.getAllNotes(
					'subscriber'
				);

				await Promise.resolve();
				await Promise.resolve();

				expect(
					store.getAll
				).toHaveBeenCalledTimes(
					1
				);

				expect(
					runtime.initialize
				).toHaveBeenCalledWith([
					note
				]);
			}
		);

		it(
			'waits for accepted Notes to load before querying the runtime',
			async () => {
				let resolveNotes:
					((notes: readonly Note[]) => void) |
					undefined;

				const store =
					new FakeNotesStore();

				store.getAll.mockReturnValue(
					new Promise(
						(resolve) => {
							resolveNotes =
								resolve;
						}
					)
				);

				const runtime =
					new FakeRuntime();

				const service =
					new NotesService(
						store,
						runtime
					);

				service.getAllNotes(
					'subscriber'
				);

				expect(
					runtime.getAll
				).not.toHaveBeenCalled();

				resolveNotes?.([]);

				await Promise.resolve();
				await Promise.resolve();

				expect(
					runtime.getAll
				).toHaveBeenCalledWith(
					'subscriber'
				);
			}
		);
	}
);
