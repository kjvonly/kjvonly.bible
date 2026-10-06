import {
	FileManagerSearchIndex
} from '../runtime/search/file-manager-search-index';

import type {
	FileManagerSearchWorkerMessage,
	FileManagerSearchWorkerRequest
} from '../runtime/search/file-manager-search-worker-message';

// One worker lifetime owns one reconstructable in-memory metadata index.
const metadataIndex =
	new FileManagerSearchIndex();

onmessage = async (
	event: MessageEvent<FileManagerSearchWorkerRequest>
) => {
	const request = event.data;

	try {
		switch (request.type) {
			case 'initialize':
				await metadataIndex.initialize(
					request.documents
				);
				postToMainThread({
					type: 'initialized'
				});
				return;

			case 'search': {
				const ids =
					await metadataIndex.search({
						text: request.text,
						...(request.filters
							? { filters: request.filters }
							: {})
					});

				postToMainThread({
					type: 'search-result',
					requestId: request.requestId,
					ids
				});
				return;
			}
		}
	} catch (error) {
		postToMainThread({
			type: 'error',
			...(request.type === 'search'
				? { requestId: request.requestId }
				: {}),
			message:
				error instanceof Error
					? error.message
					: 'FileManager search failed.'
		});
	}
};

/** Posts typed protocol messages back to the FileManager search runtime. */
function postToMainThread(
	message: FileManagerSearchWorkerMessage
): void {
	postMessage(message);
}
