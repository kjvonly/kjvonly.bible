import type { DictionaryEditionSource, DictionarySearchMatch } from '../../models/dictionary.model';
import { snapshotDictionaryWorkerSource } from '../dictionary-worker-source-snapshot';
import type {
	DictionarySearchWorkerRequest,
	DictionarySearchWorkerResponse
} from './dictionary-search-worker-message';

/** Minimal worker port used by the on-demand search client and its tests. */
export interface DictionarySearchWorkerPort {
	postMessage(message: DictionarySearchWorkerRequest): void;
	addEventListener(type: 'message', listener: (event: MessageEvent<DictionarySearchWorkerResponse>) => void): void;
	addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
	addEventListener(type: 'messageerror', listener: (event: MessageEvent) => void): void;
	terminate(): void;
}

/** Lazily started worker client shared by the Dictionary runtime while views hold leases. */
export class DictionarySearchWorkerClient {
	private worker: DictionarySearchWorkerPort | undefined;
	private readonly pending = new Map<string, {
		resolve: (response: DictionarySearchWorkerResponse) => void;
		reject: (error: Error) => void;
	}>();
	private sequence = 0;
	private disposed = false;

	constructor(private readonly createWorker: () => DictionarySearchWorkerPort) {}

	/** Returns ordered headword references; definitions are loaded by the view. */
	async search(
		query: string,
		source: DictionaryEditionSource
	): Promise<{ matches: readonly DictionarySearchMatch[] }> {
		const response = await this.request({ type: 'search', query, source: snapshotDictionaryWorkerSource(source) });
		if (response.type !== 'search-results') throw new Error('Unexpected Dictionary worker response.');
		return { matches: response.matches };
	}

	/** Terminates the worker and rejects any outstanding requests. */
	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.failAll(new Error('Dictionary search session was disposed.'));
	}

	/** Associates each outgoing request with its corresponding worker response. */
	private request(input: Omit<DictionarySearchWorkerRequest, 'id'>): Promise<DictionarySearchWorkerResponse> {
		if (this.disposed) return Promise.reject(new Error('Dictionary search session was disposed.'));
		const id = String(++this.sequence);
		const request: DictionarySearchWorkerRequest = { ...input, id };
		const worker = this.getWorker();
		return new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
			try { worker.postMessage(request); }
			catch (error) {
				this.pending.delete(id);
				reject(error);
			}
		});
	}

	/** Starts the worker on first use and connects its lifecycle events. */
	private getWorker(): DictionarySearchWorkerPort {
		if (this.worker) return this.worker;
		const worker = this.createWorker();
		worker.addEventListener('message', event => {
			if (this.worker !== worker) return;
			const response = event.data;
			if (!response || typeof response !== 'object' || typeof response.id !== 'string') {
				this.failAll(new Error('Dictionary search worker returned a malformed response.'));
				return;
			}
			const pending = this.pending.get(response.id);
			if (!pending) return;
			this.pending.delete(response.id);
			if (response.type === 'error') pending.reject(new Error(response.error));
			else pending.resolve(response);
		});
		worker.addEventListener('error', event => {
			if (this.worker !== worker) return;
			this.failAll(event.error instanceof Error ? event.error : new Error(event.message));
		});
		worker.addEventListener('messageerror', () => {
			if (this.worker !== worker) return;
			this.failAll(new Error('Dictionary worker message could not be deserialized.'));
		});
		this.worker = worker;
		return worker;
	}

	/** Rejects outstanding requests after disposal or a terminal worker failure. */
	private failAll(error: Error): void {
		this.worker?.terminate();
		this.worker = undefined;
		for (const pending of this.pending.values()) pending.reject(error);
		this.pending.clear();
	}
}

/** Browser-specific factory; do not re-export from the Node-safe Domain root. */
export function createBrowserDictionarySearchWorkerClient(): DictionarySearchWorkerClient {
	return new DictionarySearchWorkerClient(() => new Worker(
		new URL('./dictionary-search.worker.ts', import.meta.url),
		{ type: 'module' }
	));
}
