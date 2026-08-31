import {
	ResourceWorkerDiscovery,
	type ResourceWorkerDiscoveryPort
} from './resource-worker-discovery';

new ResourceWorkerDiscovery(
	self as unknown as
		ResourceWorkerDiscoveryPort
);