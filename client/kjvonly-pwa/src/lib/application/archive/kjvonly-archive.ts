import type {
	ResourceInstallation
} from '$lib/resource';

export const KJVONLY_ARCHIVE_VERSION =
	1 as const;

export interface ArchivedDomainObject {
	readonly id:
		string;

	readonly objectType:
		string;

	readonly objectId:
		string;

	readonly value:
		unknown;
}

export interface KJVOnlyArchiveV1 {
	readonly version:
		typeof KJVONLY_ARCHIVE_VERSION;

	readonly domain_objects:
		Readonly<
			Record<
				string,
				ArchivedDomainObject
			>
		>;

	readonly resource_installations:
		Readonly<
			Record<
				string,
				ResourceInstallation
			>
		>;
}
