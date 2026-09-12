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
	NotesSearchRuntime
} from '$lib/domains/notes/runtime/search/notes-search-runtime';

import type {
	NotesSearchWorkerMessage,
	NotesSearchWorkerRequest
} from '$lib/domains/notes/runtime/search/notes-search-worker-message';

class FakeWorker {
	readonly postMessage =
		vi.fn<(message: NotesSearchWorkerRequest) => void>();

	onmessage:
		((event: MessageEvent<NotesSearchWorkerMessage>) => void) |
		null =
		null;
}

function createNote(): Note {
	return {
		id: 'publisher/default/note-1',
		bibleLocationRef: undefined,
		bibleReferenceText: undefined,
		title: 'Title',
		text: 'Text',
		html: '<p>Text</p>',
		dateCreated: 1,
		dateUpdated: 2,
		tags: []
	};
}

describe(
	'NotesSearchRuntime',
	() => {
		it(
			'passes accepted Notes to the worker without persistence concerns',
			() => {
				const worker =
					new FakeWorker();

				const runtime =
					new NotesSearchRuntime(
						worker
					);

				const note =
					createNote();

				runtime.initialize([
					note
				]);

				runtime.put(
					note
				);

				runtime.putAll([
					note
				]);

				runtime.remove(
					note.id
				);

				expect(
					worker.postMessage
				).toHaveBeenNthCalledWith(
					1,
					{
						action: 'initialize',
						notes: [note]
					}
				);

				expect(
					worker.postMessage
				).toHaveBeenNthCalledWith(
					2,
					{
						action: 'put',
						note
					}
				);

				expect(
					worker.postMessage
				).toHaveBeenNthCalledWith(
					3,
					{
						action: 'put-all',
						notes: [note]
					}
				);

				expect(
					worker.postMessage
				).toHaveBeenNthCalledWith(
					4,
					{
						action: 'remove',
						noteId: note.id
					}
				);
			}
		);

		it(
			'publishes worker search results through one runtime handler',
			() => {
				const worker =
					new FakeWorker();

				const runtime =
					new NotesSearchRuntime(
						worker
					);

				const handler =
					vi.fn();

				runtime.setResultHandler(
					handler
				);

				const response = {
					id: 'subscriber',
					notes: {
						'publisher/default/note-1': createNote()
					}
				};

				worker.onmessage?.(
					{
						data: response
					} as MessageEvent<NotesSearchWorkerMessage>
				);

				expect(
					handler
				).toHaveBeenCalledWith(
					response
				);
			}
		);
	}
);
