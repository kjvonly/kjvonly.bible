import type {
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

export interface ResourceResolutionCurrent {
	readonly publisher:
		string;

	readonly resourceId:
		string;

	readonly resourceType:
		string;
}

export interface ResourceResolutionFailure {
	readonly publisher?:
		string;

	readonly resourceId?:
		string;

	readonly resourceType?:
		string;

	readonly error:
		unknown;
}

export interface ResourceResolutionResult {
	readonly contents:
		readonly VerifiedResourceContent[];

	readonly current:
		readonly ResourceResolutionCurrent[];

	readonly failures:
		readonly ResourceResolutionFailure[];
}
