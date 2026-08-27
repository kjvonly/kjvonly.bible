export interface ResourceInstallation {
	readonly id:
		string;

	readonly objectType:
		string;

	readonly objectId:
		string;

	readonly publisher:
		string;

	readonly resourceId:
		string;

	readonly eventId:
		string;

	readonly modifiedAt:
		number;
}

export function createResourceInstallationId(
	objectType: string,
	objectId: string
): string {
	return `${objectType}:${objectId}`;
}