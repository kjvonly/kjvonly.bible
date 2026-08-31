import type {
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

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

	readonly failures:
		readonly ResourceResolutionFailure[];
}