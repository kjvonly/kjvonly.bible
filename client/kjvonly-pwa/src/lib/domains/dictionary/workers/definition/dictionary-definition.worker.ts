import { createHtmlNormalizer, type HtmlNormalizer } from '@kjvonly/html-normalized-content';
import { normalizeDictionaryDefinitions } from './dictionary-definition-normalizer';
import { createDictionaryDefinitionWorkerRuntime } from './dictionary-definition-worker-composition';
import type { DictionaryDefinitionWorkerRequest, DictionaryDefinitionWorkerResponse } from './dictionary-definition-worker-message';

const runtime = createDictionaryDefinitionWorkerRuntime();
let normalizer: HtmlNormalizer | undefined;
const port = self as unknown as {
	postMessage(message: DictionaryDefinitionWorkerResponse, transfer?: Transferable[]): void;
	addEventListener(type: 'message', listener: (event: MessageEvent<DictionaryDefinitionWorkerRequest>) => void): void;
};

port.addEventListener('message', event => { void handleDefinitionRequest(event.data); });

/** Resolve and normalize a selected headword entirely in the worker; transfer only its result. */
async function handleDefinitionRequest(request: DictionaryDefinitionWorkerRequest): Promise<void> {
	try {
		if (request.type === 'get-normalized-definition') {
			const definitions = await runtime.getDefinitions(request.source, request.headwordKey);
			normalizer ??= createHtmlNormalizer();
			const documents = normalizeDictionaryDefinitions(definitions, normalizer);
			const bytes = new TextEncoder().encode(JSON.stringify(documents)).buffer;
			port.postMessage({ id: request.id, type: 'normalized-ready', bytes }, [bytes]);
			return;
		}
		throw new Error('Unsupported Dictionary definition request.');
	} catch (error) {
		port.postMessage({
			id: request.id, type: 'error',
			error: error instanceof Error ? error.message : String(error)
		});
	}
}
