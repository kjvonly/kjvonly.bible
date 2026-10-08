/** Generated staging directory reserved for Collection events. */
export const STAGED_COLLECTIONS_DIRECTORY =
	'__collections__';


/** Generated staging directory reserved for Filesystem events. */
export const STAGED_FILESYSTEMS_DIRECTORY =
	'__filesystems__';


/** Maximum UTF-8 byte length of a manifest name used as a staging segment. */
export const MAX_STAGING_LOGICAL_NAME_BYTES =
	128;


const RESERVED_STAGING_LOGICAL_NAMES =
	new Set<string>([
		STAGED_COLLECTIONS_DIRECTORY,
		STAGED_FILESYSTEMS_DIRECTORY
	]);


/**
 * Returns the staging-layout validation error for one manifest logical name.
 *
 * Resource, Collection, and Filesystem definition names become Node staging
 * path components. They must therefore remain visible single segments and
 * must not collide with staging directories owned by generated categories.
 *
 * @param value Manifest Resource, Collection, or Filesystem logical name.
 * @returns A contract error message, or `undefined` when the name is valid.
 */
export function getStagingLogicalNameError(
	value:
		string
): string | undefined {
	if (
		value.length ===
			0
	) {
		return 'Staging logical name is empty.';
	}


	if (
		Buffer.byteLength(
			value,
			'utf8'
		) >
			MAX_STAGING_LOGICAL_NAME_BYTES
	) {
		return (
			'Staging logical name exceeds ' +
			`${MAX_STAGING_LOGICAL_NAME_BYTES} UTF-8 bytes.`
		);
	}


	if (
		value.startsWith(
			'.'
		)
	) {
		return 'Staging logical name must not start with ".".';
	}


	if (
		value.includes('/') ||
		value.includes('\\')
	) {
		return 'Staging logical name must not contain path separators.';
	}


	if (
		RESERVED_STAGING_LOGICAL_NAMES.has(
			value
		)
	) {
		return `Staging logical name is reserved: ${value}`;
	}


	return undefined;
}


/**
 * Returns whether a logical name can safely participate in the staging layout.
 *
 * @param value Candidate manifest logical name.
 */
export function isStagingLogicalName(
	value:
		string
): boolean {
	return getStagingLogicalNameError(
		value
	) === undefined;
}


/**
 * Throws when a logical name cannot safely participate in the staging layout.
 *
 * @param value Candidate manifest logical name.
 */
export function assertStagingLogicalName(
	value:
		string
): void {
	const error =
		getStagingLogicalNameError(
			value
		);


	if (
		error !==
			undefined
	) {
		throw new Error(
			error
		);
	}
}
