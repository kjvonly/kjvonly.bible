import {
	FILESYSTEM_ENTRIES,
	FILESYSTEM_ENTRY_CATEGORY_INDEX,
	FILESYSTEM_ENTRY_DATA_TYPE_INDEX,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	createFilesystemSearchMatches
} from '../runtime/search/filesystem-search-result';

import type {
	FilesystemSearchIndex
} from '../models/filesystem-search-index';

import type {
	FilesystemSearchWorkerRequest
} from '../runtime/search/filesystem-search-worker-message';

/** Searches mounted filesystem metadata without materializing target Resources. */
async function search(
	request:
		FilesystemSearchWorkerRequest
): Promise<void> {
	try {
		const db =
			await getApplicationDB();

		const rows =
			await db.getAllFromIndex(
				FILESYSTEM_ENTRIES,
				getDatabaseIndex(
					request.byIndex.index
				),
				request.byIndex.value
			);

		postMessage({
			type:
				'search-result',
			id:
				request.id,
			matches:
				createFilesystemSearchMatches(
					rows,
					request.text
				)
		});
	} catch (error) {
		postMessage({
			type:
				'search-error',
			id:
				request.id,
			message:
				error instanceof Error
					? error.message
					: String(error)
		});
	}
}

onmessage = async (
	event:
		MessageEvent<FilesystemSearchWorkerRequest>
) => {
	switch (event.data.action) {
		case 'search':
			await search(
				event.data
			);
			break;
	}
};

function getDatabaseIndex(
	index: FilesystemSearchIndex
):
	typeof FILESYSTEM_ENTRY_CATEGORY_INDEX |
	typeof FILESYSTEM_ENTRY_DATA_TYPE_INDEX {
	switch (index) {
		case 'category':
			return FILESYSTEM_ENTRY_CATEGORY_INDEX;

		case 'dataType':
			return FILESYSTEM_ENTRY_DATA_TYPE_INDEX;
	}
}
