/**
 * Returns whether a value is a canonical complete Filesystem path.
 *
 * Filesystem paths are application paths rather than host operating-system
 * paths. They use `/`, have no leading or trailing slash, and contain no empty,
 * `.` or `..` segments.
 *
 * @param value Candidate complete Filesystem path.
 */
export function isCanonicalFilesystemPath(
	value:
		string
): boolean {
	return (
		value.length > 0 &&
		!value.startsWith('/') &&
		!value.endsWith('/') &&
		value
			.split('/')
			.every(
				segment =>
					isFilesystemPathSegment(
						segment
					)
			)
	);
}


/**
 * Returns whether a manifest directory path is canonical.
 *
 * The empty string represents placement directly below the Filesystem root.
 * Non-empty values use the same canonical segment rules as complete paths.
 *
 * @param value Root-relative placement directory from the CLI manifest.
 */
export function isCanonicalFilesystemDirectoryPath(
	value:
		string
): boolean {
	return (
		value.length === 0 ||
		isCanonicalFilesystemPath(
			value
		)
	);
}


/**
 * Returns whether a value can be used as one Filesystem path segment.
 *
 * @param value Placement name or concrete key used as one path segment.
 */
export function isFilesystemPathSegment(
	value:
		string
): boolean {
	return (
		value.length > 0 &&
		value !== '.' &&
		value !== '..' &&
		!value.includes('/')
	);
}


/**
 * Joins canonical logical Filesystem path components using `/`.
 *
 * Empty components are ignored so a manifest directory path of `''` can place
 * entries directly below the Filesystem root. This helper does not normalize
 * `.` or `..`; callers must validate inputs before joining them.
 *
 * @param components Canonical Filesystem path components to concatenate.
 */
export function joinFilesystemPath(
	...components:
		readonly string[]
): string {
	return components
		.filter(
			component =>
				component.length > 0
		)
		.join('/');
}


/**
 * Returns whether `path` is a canonical strict descendant of `root`.
 *
 * Equality is intentionally rejected: Filesystem entries are files beneath a
 * root/mount and the root itself is never a file entry.
 *
 * @param root Canonical Filesystem root/mount.
 * @param path Canonical complete Filesystem entry path.
 */
export function isStrictFilesystemDescendant(
	root:
		string,

	path:
		string
): boolean {
	return (
		isCanonicalFilesystemPath(
			root
		) &&
		isCanonicalFilesystemPath(
			path
		) &&
		path.startsWith(
			`${root}/`
		)
	);
}
