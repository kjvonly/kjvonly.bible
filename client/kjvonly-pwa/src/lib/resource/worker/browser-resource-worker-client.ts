import type {
	ResourceDiscovery
} from '../nostr/resource-discovery';

import type {
	ResourceResolutionStrategy
} from '../resolution/resource-resolution-strategy';

import {
	ResourceWorkerClient
} from './resource-worker-client';

export function createBrowserResourceWorkerClient(
	discovery:
		Pick<
			ResourceDiscovery,
			'get'
		>,

	strategies:
		readonly ResourceResolutionStrategy[] =
			[]
): ResourceWorkerClient {

	const worker =
		new Worker(
			new URL(
				'./resource.worker.ts',
				import.meta.url
			),
			{
				type:
					'module'
			}
		);

	return new ResourceWorkerClient(
		worker,
		discovery,
		strategies
	);
}
