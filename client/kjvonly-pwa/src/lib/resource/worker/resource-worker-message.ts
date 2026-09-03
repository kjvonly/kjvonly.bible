import type {
	PublishedResourceReference,
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import type {
	ResourceInstallOutcome,
	ResourceInstallResult
} from '$lib/resource/services/resource-install-result';

export interface ResourceWorkerError {
	readonly name:
		string;

	readonly message:
		string;

	readonly stack?:
		string;
}

type ResourceWorkerHandledOutcome =
	Extract<
		ResourceInstallOutcome,
		{
			readonly status:
				'handled';
		}
	>;

type ResourceWorkerCurrentOutcome =
	Extract<
		ResourceInstallOutcome,
		{
			readonly status:
				'current';
		}
	>;

type ResourceWorkerUnsupportedOutcome =
	Extract<
		ResourceInstallOutcome,
		{
			readonly status:
				'unsupported';
		}
	>;

type ResourceWorkerFailedOutcome =
	Omit<
		Extract<
			ResourceInstallOutcome,
			{
				readonly status:
					'failed';
			}
		>,
		'error'
	> & {
		readonly error:
			ResourceWorkerError;
	};

export type ResourceWorkerInstallOutcome =
	| ResourceWorkerHandledOutcome
	| ResourceWorkerCurrentOutcome
	| ResourceWorkerUnsupportedOutcome
	| ResourceWorkerFailedOutcome;

export type ResourceWorkerInstallResult =
	Omit<
		ResourceInstallResult,
		'resources'
	> & {
		readonly resources:
			readonly ResourceWorkerInstallOutcome[];
	};

///////////////////////////////////////////////////////////////////////////////
// Main thread → Worker

export interface ResourceWorkerInstallRequest {
	readonly type:
		'install';

	readonly requestId:
		string;

	readonly reference:
		PublishedResourceReference;
}

export interface ResourceWorkerDiscoveryResult {
	readonly type:
		'discovery-result';

	readonly requestId:
		string;

	readonly representation:
		ResourceRepresentation |
		null;
}

export interface ResourceWorkerDiscoveryError {
	readonly type:
		'discovery-error';

	readonly requestId:
		string;

	readonly error:
		ResourceWorkerError;
}

export type ResourceWorkerMainMessage =
	| ResourceWorkerInstallRequest
	| ResourceWorkerDiscoveryResult
	| ResourceWorkerDiscoveryError;

///////////////////////////////////////////////////////////////////////////////
// Worker → Main thread

export interface ResourceWorkerDiscoveryRequest {
	readonly type:
		'discovery';

	readonly requestId:
		string;

	readonly reference:
		PublishedResourceReference;
}

export interface ResourceWorkerInstallResultMessage {
	readonly type:
		'install-result';

	readonly requestId:
		string;

	readonly result:
		ResourceWorkerInstallResult;
}

export interface ResourceWorkerInstallErrorMessage {
	readonly type:
		'install-error';

	readonly requestId:
		string;

	readonly error:
		ResourceWorkerError;
}

export type ResourceWorkerMessage =
	| ResourceWorkerDiscoveryRequest
	| ResourceWorkerInstallResultMessage
	| ResourceWorkerInstallErrorMessage;

///////////////////////////////////////////////////////////////////////////////

export function serializeResourceWorkerError(
	error:
		unknown
): ResourceWorkerError {

	if (
		error instanceof
		Error
	) {
		return {
			name:
				error.name,

			message:
				error.message,

			...(
				error.stack ===
				undefined ?
					{} :
					{
						stack:
							error.stack
					}
			)
		};
	}

	return {
		name:
			'Error',

		message:
			String(
				error
			)
	};
}

export function deserializeResourceWorkerError(
	error:
		ResourceWorkerError
): Error {

	const result =
		new Error(
			error.message
		);

	result.name =
		error.name;

	if (
		error.stack !==
		undefined
	) {
		result.stack =
			error.stack;
	}

	return result;
}

export function serializeResourceWorkerInstallResult(
	result:
		ResourceInstallResult
): ResourceWorkerInstallResult {

	return {
		...result,

		resources:
			result.resources.map(
				serializeResourceWorkerInstallOutcome
			)
	};
}

export function deserializeResourceWorkerInstallResult(
	result:
		ResourceWorkerInstallResult
): ResourceInstallResult {

	return {
		...result,

		resources:
			result.resources.map(
				deserializeResourceWorkerInstallOutcome
			)
	};
}

function serializeResourceWorkerInstallOutcome(
	outcome:
		ResourceInstallOutcome
): ResourceWorkerInstallOutcome {

	if (
		outcome.status !==
		'failed'
	) {
		return outcome;
	}

	return {
		...outcome,

		error:
			serializeResourceWorkerError(
				outcome.error
			)
	};
}

function deserializeResourceWorkerInstallOutcome(
	outcome:
		ResourceWorkerInstallOutcome
): ResourceInstallOutcome {

	if (
		outcome.status !==
		'failed'
	) {
		return outcome;
	}

	return {
		...outcome,

		error:
			deserializeResourceWorkerError(
				outcome.error
			)
	};
}