import {
	ResourceWorkerDiscovery,
	type ResourceWorkerDiscoveryPort
} from './resource-worker-discovery';

import {
	ResourceWorkerStrategyResolver,
	type ResourceWorkerStrategyResolverPort
} from './resource-worker-strategy-resolver';

import {
	serializeResourceWorkerError,
	serializeResourceWorkerInstallResult,
	type ResourceWorkerInstallDescriptorRequest,
	type ResourceWorkerInstallRequest
} from './resource-worker-message';

import {
	ResourceChildWorkerClient
} from './resource-child-worker-client';

import {
	ResourceDescriptorWorkerPool
} from './resource-descriptor-worker-pool';

import {
	ResourceWorkerProcessorRouter
} from './resource-worker-processor-router';

import {
	ResourceService
} from '$lib/resource/services/resource.service';

///////////////////////////////////////////////////////////////////////////////
// Worker port

const workerPort =
	self as unknown as
		ResourceWorkerDiscoveryPort;

///////////////////////////////////////////////////////////////////////////////
// Discovery
//
// Nostr remains on the main thread.
//
// The Resource Coordinator owns root Resource Discovery and routes the
// discovered ResourceRepresentation to a child worker.

const resourceDiscovery =
	new ResourceWorkerDiscovery(
		workerPort
	);

const strategyResolver =
	new ResourceWorkerStrategyResolver(
		workerPort as unknown as
			ResourceWorkerStrategyResolverPort
	);

///////////////////////////////////////////////////////////////////////////////
// Child Resource Workers

const contentWorkerClient =
	new ResourceChildWorkerClient(
		new Worker(
			new URL(
				'./resource-content.worker.ts',
				import.meta.url
			),
			{
				type:
					'module'
			}
		)
	);

const descriptorWorkerPool =
	new ResourceDescriptorWorkerPool([
		createDescriptorWorkerClient(),
		createDescriptorWorkerClient(),
		createDescriptorWorkerClient()
	]);

function createDescriptorWorkerClient():
	ResourceChildWorkerClient {

	return new ResourceChildWorkerClient(
		new Worker(
			new URL(
				'./resource-descriptor.worker.ts',
				import.meta.url
			),
			{
				type:
					'module'
			}
		),
		strategyResolver
	);
}

///////////////////////////////////////////////////////////////////////////////
// Resource Service
//
// ResourceService owns:
//
// - in-flight Resource installation coordination
// - root Resource Discovery
// - already-known descriptor installation
//
// Once Discovery returns ResourceRepresentation, the Coordinator routes
// processing by representation type.

const resourceWorkerProcessor =
	new ResourceWorkerProcessorRouter(
		contentWorkerClient,
		descriptorWorkerPool
	);

const resourceService =
	new ResourceService(
		resourceDiscovery,
		resourceWorkerProcessor,
		descriptorWorkerPool
	);

///////////////////////////////////////////////////////////////////////////////
// Install request host

workerPort.addEventListener(
	'message',
	(event) => {

		const message =
			event.data;

		if (
			message.type ===
				'install'
		) {
			void handleInstall(
				message
			);

			return;
		}

		if (
			message.type ===
				'install-descriptor'
		) {
			void handleInstallDescriptor(
				message
			);
		}
	}
);

async function handleInstall(
	message:
		ResourceWorkerInstallRequest
): Promise<void> {

	try {
		const result =
			await resourceService.install(
				message.reference
			);

		workerPort.postMessage({
			type:
				'install-result',

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
				'install-error',

			requestId:
				message.requestId,

			error:
				serializeResourceWorkerError(
					error
				)
		});
	}
}

async function handleInstallDescriptor(
	message:
		ResourceWorkerInstallDescriptorRequest
): Promise<void> {

	try {
		const result =
			await resourceService.installDescriptor(
				message.descriptor
			);

		workerPort.postMessage({
			type:
				'install-result',

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
				'install-error',

			requestId:
				message.requestId,

			error:
				serializeResourceWorkerError(
					error
				)
		});
	}
}
