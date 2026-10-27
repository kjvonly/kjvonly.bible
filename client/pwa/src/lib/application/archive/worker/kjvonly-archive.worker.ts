import {
	createKJVOnlyArchiveWorkerOperations
} from './kjvonly-archive-worker-composition';

import {
	serializeKJVOnlyArchiveWorkerError,
	type KJVOnlyArchiveWorkerMessage,
	type KJVOnlyArchiveWorkerRequest
} from './kjvonly-archive-worker-message';

interface KJVOnlyArchiveWorkerPort {
	postMessage(
		message:
			KJVOnlyArchiveWorkerMessage,

		transfer?:
			Transferable[]
	): void;

	addEventListener(
		type:
			'message',

		listener:
			(
				event:
					MessageEvent<
						KJVOnlyArchiveWorkerRequest
					>
			) => void
	): void;
}

const workerPort =
	self as unknown as
		KJVOnlyArchiveWorkerPort;

const operations =
	createKJVOnlyArchiveWorkerOperations();

workerPort.addEventListener(
	'message',
	(event) => {
		void handleRequest(
			event.data
		);
	}
);

async function handleRequest(
	request:
		KJVOnlyArchiveWorkerRequest
): Promise<void> {
	try {
		if (
			request.type ===
				'import'
		) {
			workerPort.postMessage({
				type:
					'import-result',
				result:
					await operations.import(
						request.value
					)
			});

			return;
		}

		const value =
			request.type ===
				'export-ids'
				? await operations.exportIds(
					request.selection
				)
				: await operations.export(
					request.selection
				);

		workerPort.postMessage(
			{
				type:
					'export-result',
				value
			},
			[
				value.buffer as
					ArrayBuffer
			]
		);
	} catch (error) {
		workerPort.postMessage({
			type:
				'error',
			error:
				serializeKJVOnlyArchiveWorkerError(
					error
				)
		});
	}
}
