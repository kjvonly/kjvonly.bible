import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	KJVOnlyArchiveWorkerClient,
	type KJVOnlyArchiveWorkerPort
} from './kjvonly-archive-worker-client';

import type {
	KJVOnlyArchiveWorkerMessage,
	KJVOnlyArchiveWorkerRequest
} from './kjvonly-archive-worker-message';

describe(
	'KJVOnlyArchiveWorkerClient',
	() => {
		it(
			'creates and terminates one worker for an export operation',
			async () => {
				const worker =
					new FakeArchiveWorker();

				const createWorker =
					vi.fn(
						() => worker
					);

				const client =
					new KJVOnlyArchiveWorkerClient(
						createWorker
					);

				const resultPromise =
					client.export({
						objectTypes:
							new Set([
								'notes/note'
							])
					});

				expect(
					worker.messages
				).toEqual([
					{
						type:
							'export',
						objectTypes: [
							'notes/note'
						]
					}
				]);

				worker.emitMessage({
					type:
						'export-result',
					value:
						new Uint8Array([
							1,
							2,
							3
						])
				});

				await expect(
					resultPromise
				).resolves.toEqual(
					new Uint8Array([
						1,
						2,
						3
					])
				);

				expect(
					createWorker
				).toHaveBeenCalledTimes(
					1
				);

				expect(
					worker.terminate
				).toHaveBeenCalledTimes(
					1
				);
			}
		);

		it(
			'creates and terminates a separate worker for each operation',
			async () => {
				const workers = [
					new FakeArchiveWorker(),
					new FakeArchiveWorker()
				];

				const createWorker =
					vi.fn(
						() =>
							workers.shift()!
					);

				const client =
					new KJVOnlyArchiveWorkerClient(
						createWorker
					);

				const firstWorker =
					workers[0];

				const importPromise =
					client.import(
						new Uint8Array([
							7
						])
					);

				firstWorker.emitMessage({
					type:
						'import-result',
					result: {
						resources: []
					}
				});

				await importPromise;

				const secondWorker =
					workers[0];

				const exportPromise =
					client.export({
						objectTypes:
							new Set([
								'notes/note'
							])
					});

				secondWorker.emitMessage({
					type:
						'export-result',
					value:
						new Uint8Array()
				});

				await exportPromise;

				expect(
					createWorker
				).toHaveBeenCalledTimes(
					2
				);

				expect(
					firstWorker.terminate
				).toHaveBeenCalledTimes(
					1
				);

				expect(
					secondWorker.terminate
				).toHaveBeenCalledTimes(
					1
				);
			}
		);

		it(
			'terminates the worker when the archive operation fails',
			async () => {
				const worker =
					new FakeArchiveWorker();

				const client =
					new KJVOnlyArchiveWorkerClient(
						() => worker
					);

				const resultPromise =
					client.import(
						new Uint8Array()
					);

				worker.emitMessage({
					type:
						'error',
					error: {
						name:
							'Error',
						message:
							'bad archive'
					}
				});

				await expect(
					resultPromise
				).rejects.toThrow(
					'bad archive'
				);

				expect(
					worker.terminate
				).toHaveBeenCalledTimes(
					1
				);
			}
		);
	}
);

class FakeArchiveWorker
	implements KJVOnlyArchiveWorkerPort {
	readonly messages:
		KJVOnlyArchiveWorkerRequest[] =
			[];

	readonly terminate =
		vi.fn();

	private messageListener:
		((
			event:
				MessageEvent<
					KJVOnlyArchiveWorkerMessage
				>
		) => void) |
		undefined;

	postMessage(
		message:
			KJVOnlyArchiveWorkerRequest
	): void {
		this.messages.push(
			message
		);
	}

	addEventListener(
		type:
			'message' |
			'error' |
			'messageerror',

		listener:
			((
				event:
					MessageEvent<
						KJVOnlyArchiveWorkerMessage
					>
			) => void) |
			((
				event:
					ErrorEvent
			) => void) |
			((
				event:
					MessageEvent
			) => void)
	): void {
		if (
			type ===
				'message'
		) {
			this.messageListener =
				listener as (
					event:
						MessageEvent<
							KJVOnlyArchiveWorkerMessage
						>
				) => void;
		}
	}

	emitMessage(
		message:
			KJVOnlyArchiveWorkerMessage
	): void {
		this.messageListener?.(
			{
				data:
					message
			} as MessageEvent<
				KJVOnlyArchiveWorkerMessage
			>
		);
	}
}
