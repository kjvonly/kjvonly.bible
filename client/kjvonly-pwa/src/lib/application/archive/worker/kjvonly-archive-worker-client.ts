import type {
	KJVOnlyArchiveExportSelection
} from '../kjvonly-archive-exporter';

import type {
	KJVOnlyArchiveImportResult
} from '../kjvonly-archive-importer';

import {
	deserializeKJVOnlyArchiveWorkerError,
	type KJVOnlyArchiveWorkerMessage,
	type KJVOnlyArchiveWorkerRequest
} from './kjvonly-archive-worker-message';

export interface KJVOnlyArchiveWorkerPort {
	postMessage(
		message:
			KJVOnlyArchiveWorkerRequest
	): void;

	addEventListener(
		type:
			'message',

		listener:
			(
				event:
					MessageEvent<
						KJVOnlyArchiveWorkerMessage
					>
			) => void
	): void;

	addEventListener(
		type:
			'error',

		listener:
			(
				event:
					ErrorEvent
			) => void
	): void;

	addEventListener(
		type:
			'messageerror',

		listener:
			(
				event:
					MessageEvent
			) => void
	): void;

	terminate(): void;
}

export type KJVOnlyArchiveWorkerFactory =
	() => KJVOnlyArchiveWorkerPort;

export class KJVOnlyArchiveWorkerClient {
	constructor(
		private readonly createWorker:
			KJVOnlyArchiveWorkerFactory
	) {}

	import(
		value: Uint8Array
	): Promise<KJVOnlyArchiveImportResult> {
		return this.run({
			type:
				'import',
			value
		}).then(
			(message) => {
				if (
					message.type !==
						'import-result'
				) {
					throw new Error(
						'KJVOnly Archive worker returned an unexpected result for an import request.'
					);
				}

				return message.result;
			}
		);
	}

	export(
		selection:
			KJVOnlyArchiveExportSelection
	): Promise<Uint8Array> {
		return this.run({
			type:
				'export',
			selection
		}).then(
			(message) => {
				if (
					message.type !==
						'export-result'
				) {
					throw new Error(
						'KJVOnly Archive worker returned an unexpected result for an export request.'
					);
				}

				return message.value;
			}
		);
	}

	private run(
		request:
			KJVOnlyArchiveWorkerRequest
	): Promise<KJVOnlyArchiveWorkerMessage> {
		const worker =
			this.createWorker();

		return new Promise(
			(
				resolve,
				reject
			) => {
				let settled =
					false;

				const finish =
					(
						operation:
							() => void
					) => {
						if (settled) {
							return;
						}

						settled =
							true;

						worker.terminate();
						operation();
					};

				worker.addEventListener(
					'message',
					(event) => {
						const message =
							event.data;

						if (
							message.type ===
								'error'
						) {
							finish(
								() => {
									reject(
										deserializeKJVOnlyArchiveWorkerError(
											message.error
										)
									);
								}
							);

							return;
						}

						finish(
							() => {
								resolve(
									message
								);
							}
						);
					}
				);

				worker.addEventListener(
					'error',
					(event) => {
						finish(
							() => {
								reject(
									event.error ??
										new Error(
											event.message
										)
								);
							}
						);
					}
				);

				worker.addEventListener(
					'messageerror',
					() => {
						finish(
							() => {
								reject(
									new Error(
										'KJVOnly Archive worker message could not be deserialized.'
									)
								);
							}
						);
					}
				);

				worker.postMessage(
					request
				);
			}
		);
	}
}

export function createBrowserKJVOnlyArchiveWorkerClient():
	KJVOnlyArchiveWorkerClient {
	return new KJVOnlyArchiveWorkerClient(
		() =>
			new Worker(
				new URL(
					'./kjvonly-archive.worker.ts',
					import.meta.url
				),
				{
					type:
						'module'
				}
			)
	);
}
