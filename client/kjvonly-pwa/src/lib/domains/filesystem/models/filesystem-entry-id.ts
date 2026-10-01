/**
 * Generic installed-object type used when a Resource installation points at a
 * persisted filesystem entry.
 *
 * Filesystem entries live in filesystem persistence, not DOMAIN_OBJECTS.
 */
export const FILESYSTEM_ENTRY_OBJECT_TYPE =
	'filesystem/entry';

/**
 * Creates the stable identity of one filesystem entry.
 *
 * Identity belongs to the filesystem source publisher, filesystem root, and
 * root-relative path. The publisher inside the target ResourceDescriptor
 * deliberately does not participate, so a publisher may curate or expose a
 * Resource published by someone else.
 */
export function createFilesystemEntryId(
	publisher: string,
	rootPath: string,
	path: string
): string {
	validateIdentityPart(
		'publisher',
		publisher
	);

	validateIdentityPart(
		'rootPath',
		rootPath
	);

	validateIdentityPart(
		'path',
		path
	);

	return JSON.stringify([
		publisher,
		rootPath,
		path
	]);
}

/** Validates one component of filesystem entry identity. */
function validateIdentityPart(
	label: string,
	value: string
): void {
	if (
		value.length ===
		0
	) {
		throw new Error(
			`Invalid filesystem entry ${label}: ${value}`
		);
	}
}
