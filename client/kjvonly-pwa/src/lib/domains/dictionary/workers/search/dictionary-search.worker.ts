import { createDictionarySearchWorkerRuntime } from './dictionary-search-worker-composition';
import type {
	DictionarySearchWorkerRequest,
	DictionarySearchWorkerResponse
} from './dictionary-search-worker-message';

const port = self as unknown as {
	postMessage(message: DictionarySearchWorkerResponse): void;
	addEventListener(type: 'message', listener: (event: MessageEvent<DictionarySearchWorkerRequest>) => void): void;
};
const runtime = createDictionarySearchWorkerRuntime();

port.addEventListener('message', event => { void handle(event.data); });

/** Routes a worker request to the search facade and preserves request IDs. */
async function handle(request: DictionarySearchWorkerRequest): Promise<void> {
	try {
		const matches = await runtime.search(request.query, request.source);
		port.postMessage({ id: request.id, type: 'search-results', matches });
	} catch (error) {
		port.postMessage({
			id: request.id,
			type: 'error',
			error: error instanceof Error ? error.message : String(error)
		});
	}
}
