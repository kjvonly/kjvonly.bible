import {
	serializeResourceWorkerError,
	serializeResourceWorkerInstallResult
} from './resource-worker-message';

import type {
	ResourceChildWorkerMessage,
	ResourceChildWorkerProcessRequest,
	ResourceChildWorkerRequest
} from './resource-child-worker-message';

import {
	createDescriptorResourceProcessor
} from './resource-worker-composition';

import {
	ResourceWorkerStrategyResolver,
	type ResourceWorkerStrategyResolverPort
} from './resource-worker-strategy-resolver';

interface ResourceDescriptorWorkerPort {
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
		ResourceDescriptorWorkerPort;

const strategyResolver =
	new ResourceWorkerStrategyResolver(
		workerPort as unknown as
			ResourceWorkerStrategyResolverPort
	);

const resourceProcessor =
	createDescriptorResourceProcessor(
		strategyResolver
	);

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
		ResourceChildWorkerProcessRequest
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
