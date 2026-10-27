import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	LocatedFilesystemEntry
} from '../../models/located-filesystem-entry.model';

import {
	FileManagerSearchRuntime,
	type FileManagerSearchWorkerPort
} from './file-manager-search-runtime';

import type {
	FileManagerSearchWorkerMessage,
	FileManagerSearchWorkerRequest
} from './file-manager-search-worker-message';

describe(
	'FileManagerSearchRuntime',
	() => {
		it(
			'initializes one worker and resolves search requests by request id',
			async () => {
				const worker =
					new FakeWorker();
				const runtime =
					new FileManagerSearchRuntime(
						() => worker
					);
				const entries = [
					createLocatedEntry()
				];
				const id = JSON.stringify([
					'alice',
					'library',
					'library/grace'
				]);

				const initialized =
					runtime.initialize(entries);

				expect(worker.messages[0]).toEqual({
					type: 'initialize',
					documents: [
						{
							id,
							name: 'Grace',
							path: 'library/grace',
							filesystemPublisher: 'alice',
							rootPath: 'library',
							resourcePublisher: 'resource-publisher',
							resourceType: 'normalized-content/document',
							category: 'sermons',
							dataType: 'kjvonly.normalized-document',
							mediaType: 'application/json',
							fileType: 'document'
						}
					]
				});

				worker.emit({
					type: 'initialized'
				});
				await initialized;

				const search =
					runtime.search({
						text: 'grace',
						filters: {
							dataType: 'kjvonly.normalized-document'
						}
					});

				expect(worker.messages[1]).toEqual({
					type: 'search',
					requestId: 1,
					text: 'grace',
					filters: {
						dataType: 'kjvonly.normalized-document'
					}
				});

				worker.emit({
					type: 'search-result',
					requestId: 1,
					ids: [id]
				});

				await expect(search)
					.resolves.toEqual(entries);
			}
		);

		it(
			'keeps the runtime active when one worker query fails',
			async () => {
				const worker =
					new FakeWorker();
				const runtime =
					new FileManagerSearchRuntime(
						() => worker
					);

				const search =
					runtime.search({ text: 'grace' });

				worker.emit({
					type: 'error',
					requestId: 1,
					message: 'Query failed.'
				});

				await expect(search)
					.rejects.toThrow('Query failed.');
				expect(runtime.isActive).toBe(true);
				expect(worker.terminate).not.toHaveBeenCalled();

				const retry =
					runtime.search({ text: 'faith' });

				worker.emit({
					type: 'search-result',
					requestId: 2,
					ids: []
				});

				await expect(retry)
					.resolves.toEqual([]);
			}
		);

		it(
			'rejects initialization when the worker reports an initialization error',
			async () => {
				const worker =
					new FakeWorker();
				const runtime =
					new FileManagerSearchRuntime(
						() => worker
					);

				const initialization =
					runtime.initialize([]);

				worker.emit({
					type: 'error',
					message: 'Initialization failed.'
				});

				await expect(initialization)
					.rejects.toThrow(
						'Initialization failed.'
					);
				expect(runtime.isActive).toBe(true);
				expect(worker.terminate).not.toHaveBeenCalled();
			}
		);

		it(
			'marks the runtime inactive when the Worker fails',
			async () => {
				const worker =
					new FakeWorker();
				const runtime =
					new FileManagerSearchRuntime(
						() => worker
					);

				const search =
					runtime.search({ text: 'grace' });

				worker.emitError(
					new Error('Worker crashed.')
				);

				expect(runtime.isActive).toBe(false);
				expect(worker.terminate)
					.toHaveBeenCalledOnce();
				await expect(search)
					.rejects.toThrow('Worker crashed.');
				expect(
					() => runtime.search({ text: 'faith' })
				).toThrow(
					'FileManager search runtime has been disposed.'
				);
			}
		);

		it(
			'marks the runtime inactive when a Worker message cannot be deserialized',
			async () => {
				const worker =
					new FakeWorker();
				const runtime =
					new FileManagerSearchRuntime(
						() => worker
					);

				const search =
					runtime.search({ text: 'grace' });

				worker.emitMessageError();

				expect(runtime.isActive).toBe(false);
				expect(worker.terminate)
					.toHaveBeenCalledOnce();
				await expect(search)
					.rejects.toThrow(
						'FileManager search worker message could not be deserialized.'
					);
			}
		);

		it(
			'terminates the worker and rejects pending searches when disposed',
			async () => {
				const worker =
					new FakeWorker();
				const runtime =
					new FileManagerSearchRuntime(
						() => worker
					);

				const search =
					runtime.search({ text: 'grace' });

				runtime.dispose();

				expect(worker.terminate)
					.toHaveBeenCalledOnce();
				await expect(search)
					.rejects.toThrow(
						'FileManager search runtime was disposed.'
					);
			}
		);
	}
);

class FakeWorker
	implements FileManagerSearchWorkerPort {
	readonly messages:
		FileManagerSearchWorkerRequest[] = [];

	readonly terminate = vi.fn();

	private messageHandler:
		((event: MessageEvent<FileManagerSearchWorkerMessage>) => void) |
		undefined;
	private errorHandler:
		((event: ErrorEvent) => void) |
		undefined;
	private messageErrorHandler:
		((event: MessageEvent) => void) |
		undefined;

	postMessage(
		message: FileManagerSearchWorkerRequest
	): void {
		this.messages.push(message);
	}

	addEventListener(
		type: 'message',
		listener: (
			event: MessageEvent<FileManagerSearchWorkerMessage>
		) => void
	): void;
	addEventListener(
		type: 'error',
		listener: (
			event: ErrorEvent
		) => void
	): void;
	addEventListener(
		type: 'messageerror',
		listener: (
			event: MessageEvent
		) => void
	): void;
	addEventListener(
		type: 'message' | 'error' | 'messageerror',
		listener: unknown
	): void {
		if (type === 'message') {
			this.messageHandler =
				listener as (
					event: MessageEvent<FileManagerSearchWorkerMessage>
				) => void;
			return;
		}

		if (type === 'error') {
			this.errorHandler =
				listener as (
					event: ErrorEvent
				) => void;
			return;
		}

		this.messageErrorHandler =
			listener as (
				event: MessageEvent
			) => void;
	}

	emit(
		message: FileManagerSearchWorkerMessage
	): void {
		this.messageHandler?.(
			{ data: message } as MessageEvent<FileManagerSearchWorkerMessage>
		);
	}

	emitError(
		error: Error
	): void {
		this.errorHandler?.(
			{
				error,
				message: error.message
			} as ErrorEvent
		);
	}

	emitMessageError(): void {
		this.messageErrorHandler?.(
			{} as MessageEvent
		);
	}
}

function createLocatedEntry(): LocatedFilesystemEntry {
	return {
		filesystemPublisher: 'alice',
		rootPath: 'library',
		entry: {
			path: 'library/grace',
			descriptor: {
				resourceMetadata: {
					category: 'sermons'
				},
				metadata: {
					publisher: 'resource-publisher',
					resourceId: 'resource/grace',
					name: 'Grace',
					resourceType: 'normalized-content/document',
					dataType: 'kjvonly.normalized-document',
					dataVersion: 1,
					modifiedAt: 1,
					representation: 'content',
					mediaType: 'application/json'
				},
				strategy: {
					type: 'test',
					data: null
				}
			}
		}
	};
}
