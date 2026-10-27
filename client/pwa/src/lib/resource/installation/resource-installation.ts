import type {
	ResourceMetadata
} from '../models/resource.model';

export interface ResourceInstallation {
	readonly id:
		string;

	readonly objectType:
		string;

	readonly objectId:
		string;

	readonly publisher:
		string;

	readonly resourceId?:
		string;

	/** Resource envelope metadata preserved as installation provenance. */
	readonly metadata?:
		ResourceMetadata;

	readonly modifiedAt:
		number;
}

export function createResourceInstallationId(
	objectType: string,
	objectId: string
): string {
	return `${objectType}:${objectId}`;
}