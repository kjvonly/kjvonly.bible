import {
	serializeResourceWorkerError,
	serializeResourceWorkerInstallResult
} from './resource-worker-message';

import type {
	ResourceChildWorkerMessage,
	ResourceChildWorkerRequest
} from './resource-child-worker-message';

import {
	createContentResourceProcessor
} from './resource-worker-composition';

interface ResourceContentWorkerPort {
	postMessage(
		message:
			ResourceChildWorkerMessage
	): void;

	addEventListener(
		type:
			'message',

		listener:
			(
				event:
					MessageEvent<
						ResourceChildWorkerRequest
					>
			) => void
	): void;
}

const workerPort =
	self as unknown as
		ResourceContentWorkerPort;

const resourceProcessor =
	createContentResourceProcessor();

workerPort.addEventListener(
	'message',
	(event) => {

		const message =
			event.data;

		if (
			message.type !==
			'process'
		) {
			return;
		}

		void handleProcess(
			message
		);
	}
);

async function handleProcess(
	message:
		ResourceChildWorkerRequest
): Promise<void> {

	try {
		const result =
			await resourceProcessor.process(
				message.requested,
				message.representation
			);

		workerPort.postMessage({
			type:
				'process-result',

			requestId:
				message.requestId,

			result:
				serializeResourceWorkerInstallResult(
					result
				)
		});
	} catch (error) {
		workerPort.postMessage({
			type:
				'process-error',

			requestId:
				message.requestId,

			error:
				serializeResourceWorkerError(
					error
				)
		});
	}
}
