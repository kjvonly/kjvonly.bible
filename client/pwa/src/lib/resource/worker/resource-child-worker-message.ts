import type {
	PublishedResourceReference,
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	ResourceWorkerError,
	ResourceWorkerInstallResult
} from './resource-worker-message';

import type {
	ResourceWorkerStrategyResolveRequest,
	ResourceWorkerStrategyResolveResponse
} from './resource-worker-strategy-message';

///////////////////////////////////////////////////////////////////////////////
// Resource Coordinator → Child Resource Worker

export interface ResourceChildWorkerProcessRepresentationRequest {
	readonly type:
		'process';

	readonly requestId:
		string;

	readonly requested:
		PublishedResourceReference;

	readonly representation:
		ResourceRepresentation;
}


export interface ResourceChildWorkerProcessDescriptorRequest {
	readonly type:
		'process-descriptor';

	readonly requestId:
		string;

	readonly descriptor:
		ResourceDescriptor;
}

export type ResourceChildWorkerRequest =
	| ResourceChildWorkerProcessRepresentationRequest
	| ResourceChildWorkerProcessDescriptorRequest
	| ResourceWorkerStrategyResolveResponse;

///////////////////////////////////////////////////////////////////////////////
// Child Resource Worker → Resource Coordinator

export interface ResourceChildWorkerProcessResult {
	readonly type:
		'process-result';

	readonly requestId:
		string;

	readonly result:
		ResourceWorkerInstallResult;
}

export interface ResourceChildWorkerProcessError {
	readonly type:
		'process-error';

	readonly requestId:
		string;

	readonly error:
		ResourceWorkerError;
}

export type ResourceChildWorkerMessage =
	| ResourceChildWorkerProcessResult
	| ResourceChildWorkerProcessError
	| ResourceWorkerStrategyResolveRequest;
