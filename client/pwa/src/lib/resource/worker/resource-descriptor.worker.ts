import {
	serializeResourceWorkerError,
	serializeResourceWorkerInstallResult
} from './resource-worker-message';

import type {
	ResourceChildWorkerMessage,
	ResourceChildWorkerProcessDescriptorRequest,
	ResourceChildWorkerProcessRepresentationRequest,
	ResourceChildWorkerRequest
} from './resource-child-worker-message';

import {
	createDescriptorResourceProcessors
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

const processors =
	createDescriptorResourceProcessors(
		strategyResolver
	);

workerPort.addEventListener(
	'message',
	(event) => {

		const message =
			event.data;

		if (
			message.type ===
				'process'
		) {
			void handleProcessRepresentation(
				message
			);

			return;
		}

		if (
			message.type ===
				'process-descriptor'
		) {
			void handleProcessDescriptor(
				message
			);
		}
	}
);

async function handleProcessRepresentation(
	message:
		ResourceChildWorkerProcessRepresentationRequest
): Promise<void> {

	try {
		const result =
			await processors.representation.process(
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

async function handleProcessDescriptor(
	message:
		ResourceChildWorkerProcessDescriptorRequest
): Promise<void> {

	try {
		const result =
			await processors.descriptor.process(
				message.descriptor
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
