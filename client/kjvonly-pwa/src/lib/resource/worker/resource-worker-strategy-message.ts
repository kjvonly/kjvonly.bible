import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	ResourceWorkerError
} from './resource-worker-message';

export interface ResourceWorkerStrategyResolveRequest {
	readonly type:
		'strategy-resolve';

	readonly requestId:
		string;

	readonly descriptor:
		ResourceDescriptor;
}

export interface ResourceWorkerStrategyResolveResult {
	readonly type:
		'strategy-resolve-result';

	readonly requestId:
		string;

	readonly content:
		Uint8Array;
}

export interface ResourceWorkerStrategyResolveError {
	readonly type:
		'strategy-resolve-error';

	readonly requestId:
		string;

	readonly error:
		ResourceWorkerError;
}

export type ResourceWorkerStrategyResolveResponse =
	| ResourceWorkerStrategyResolveResult
	| ResourceWorkerStrategyResolveError;
