import type { NormalizedDocument } from '@kjvonly/normalized-content';
import type { DictionaryEditionSource } from '../../models/dictionary.model';

import type { DictionaryDefinitionWorkerRequest, DictionaryDefinitionWorkerResponse } from './dictionary-definition-worker-message';
import { snapshotDictionaryWorkerSource } from '../dictionary-worker-source-snapshot';

/** Browser Worker port, injectable to test lifecycle and message correlation. */
export interface DictionaryDefinitionWorkerPort {
	postMessage(message: DictionaryDefinitionWorkerRequest): void;
	addEventListener(type: 'message', listener: (event: MessageEvent<DictionaryDefinitionWorkerResponse>) => void): void;
	addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
	addEventListener(type: 'messageerror', listener: (event: MessageEvent) => void): void;
	terminate(): void;
}

/** Reusable, lazily started worker for selected-word definition reads. */
export class DictionaryDefinitionWorkerClient {
	private worker: DictionaryDefinitionWorkerPort | undefined;
	private readonly pending = new Map<string, {
		resolve: (bytes: ArrayBuffer) => void;
		reject: (error: Error) => void;
	}>();
	private sequence = 0;
	private disposed = false;

	constructor(private readonly createWorker: () => DictionaryDefinitionWorkerPort) {}

	/** Return one validated document containing all selected definitions in source order. */
	async getNormalized(source: DictionaryEditionSource, headwordKey: string): Promise<NormalizedDocument> {
		const bytes = await this.request(source, headwordKey);
		const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
		if (!value || typeof value !== 'object' ||
			!Array.isArray((value as { blocks?: unknown }).blocks)) {
			throw new Error('Invalid normalized Dictionary definition response.');
		}
		return value as NormalizedDocument;
	}

	/** End the on-demand worker session and reject any outstanding requests. */
	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.failAll(new Error('Dictionary definition session was disposed.'));
	}

	/** Correlate simultaneous selected-word requests without transferring HTML chunks. */
	private request(source: DictionaryEditionSource, headwordKey: string): Promise<ArrayBuffer> {
		if (this.disposed) return Promise.reject(new Error('Dictionary definition session was disposed.'));
		const id = String(++this.sequence);
		const message: DictionaryDefinitionWorkerRequest = {
			id, type: 'get-normalized-definition', source: snapshotDictionaryWorkerSource(source), headwordKey
		};
		const worker = this.getWorker();
		return new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
			try { worker.postMessage(message); }
			catch (error) {
				this.pending.delete(id);
				reject(error);
			}
		});
	}

	/** Launch on the first request, then reuse the worker while the view remains active. */
	private getWorker(): DictionaryDefinitionWorkerPort {
		if (this.worker) return this.worker;
		const worker = this.createWorker();
		worker.addEventListener('message', event => {
			if (this.worker !== worker) return;
			const response = event.data;
			if (!response || typeof response !== 'object' || typeof response.id !== 'string') {
				this.failAll(new Error('Dictionary definition worker returned a malformed response.'));
				return;
			}
			const pending = this.pending.get(response.id);
			if (!pending) return;
			this.pending.delete(response.id);
			if (response.type === 'error') pending.reject(new Error(response.error));
			else if (response.type !== 'normalized-ready') {
				pending.reject(new Error('Unexpected Dictionary definition worker response.'));
			} else pending.resolve(response.bytes);
		});
		worker.addEventListener('error', event => {
			if (this.worker !== worker) return;
			this.failAll(event.error instanceof Error ? event.error : new Error(event.message));
		});
		worker.addEventListener('messageerror', () => {
			if (this.worker !== worker) return;
			this.failAll(new Error('Dictionary definition worker response could not be deserialized.'));
		});
		this.worker = worker;
		return worker;
	}

	/** Stop the worker once and settle every pending caller on failure/disposal. */
	private failAll(error: Error): void {
		this.worker?.terminate();
		this.worker = undefined;
		for (const pending of this.pending.values()) pending.reject(error);
		this.pending.clear();
	}
}

/** Browser-specific entry point; never re-export through the Node-safe Domain root. */
export function createBrowserDictionaryDefinitionWorkerClient(): DictionaryDefinitionWorkerClient {
	return new DictionaryDefinitionWorkerClient(() => new Worker(
		new URL('./dictionary-definition.worker.ts', import.meta.url), { type: 'module' }
	));
}
