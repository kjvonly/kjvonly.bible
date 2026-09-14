import type {
	PublishedResourceReference,
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

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

export interface ResourceChildWorkerProcessRequest {
	readonly type:
		'process';

	readonly requestId:
		string;

	readonly requested:
		PublishedResourceReference;

	readonly representation:
		ResourceRepresentation;
}

export type ResourceChildWorkerRequest =
	| ResourceChildWorkerProcessRequest
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
