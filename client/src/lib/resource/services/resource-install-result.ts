import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

export type ResourceInstallOutcome =
	| {
			readonly reference:
				PublishedResourceReference;

			readonly resourceType:
				string;

			readonly status:
				'handled';
	  }
	| {
			readonly reference:
				PublishedResourceReference;

			readonly resourceType:
				string;

			readonly status:
				'unsupported';
	  }
	| {
			readonly reference:
				PublishedResourceReference;

			readonly resourceType:
				string;

			readonly status:
				'failed';

			readonly error:
				unknown;
	  };

export interface ResourceInstallResult {
	readonly requested:
		PublishedResourceReference;

	readonly found:
		boolean;

	readonly resources:
		readonly ResourceInstallOutcome[];
}