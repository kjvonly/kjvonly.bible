import {
	ResourceWorkerDiscovery,
	type ResourceWorkerDiscoveryPort
} from './resource-worker-discovery';

import {
	serializeResourceWorkerError,
	serializeResourceWorkerInstallResult,
	type ResourceWorkerInstallRequest
} from './resource-worker-message';

import {
	ResourceChildWorkerClient
} from './resource-child-worker-client';

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

const descriptorWorkerClient =
	new ResourceChildWorkerClient(
		new Worker(
			new URL(
				'./resource-descriptor.worker.ts',
				import.meta.url
			),
			{
				type:
					'module'
			}
		)
	);

///////////////////////////////////////////////////////////////////////////////
// Resource Service
//
// ResourceService owns:
//
// - exact Published Resource in-flight deduplication
// - root Resource Discovery
//
// Once Discovery returns ResourceRepresentation, the Coordinator routes
// processing by representation type.

const resourceService =
	new ResourceService(
		resourceDiscovery,
		{
			process:
				(
					requested,
					representation
				) => {

					if (
						representation.representation ===
							'content'
					) {
						return contentWorkerClient.process(
							requested,
							representation
						);
					}

					return descriptorWorkerClient.process(
						requested,
						representation
					);
				}
		}
	);

///////////////////////////////////////////////////////////////////////////////
// Install request host

workerPort.addEventListener(
	'message',
	(event) => {

		const message =
			event.data;

		if (
			message.type !==
			'install'
		) {
			return;
		}

		void handleInstall(
			message
		);
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
