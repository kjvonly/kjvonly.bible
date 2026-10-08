import type {
	ResourceDescriptorValidator,
	ResourceValidator
} from '$lib/resource';

import type {
	FilesystemEntryCandidate
} from './filesystem-entry-candidate';

import type {
	ValidatedFilesystemEntryCandidate
} from './validated-filesystem-entry-candidate';

/**
 * Validates filesystem placement while delegating target Resource descriptor
 * validation to the generic Resource layer.
 */
export class FilesystemValidator
	implements ResourceValidator<
		FilesystemEntryCandidate,
		ValidatedFilesystemEntryCandidate
	> {

	constructor(
		private readonly descriptorValidator:
			Pick<
				ResourceDescriptorValidator,
				'validate'
			>
	) {}

	/**
	 * Validates one Filesystem Resource root independently of its entry count.
	 *
	 * @param rootPath Root supplied by the Filesystem Resource `f` metadata.
	 */
	validateRootPath(
		rootPath: string
	): void {
		validateCanonicalFilesystemPath(
			rootPath,
			'rootPath'
		);
	}

	/**
	 * Validates one full-path filesystem mapping and returns its trusted descriptor.
	 *
	 * @param candidate Mapping interpreted from one Filesystem Resource payload entry.
	 */
	validate(
		candidate:
			FilesystemEntryCandidate
	): ValidatedFilesystemEntryCandidate {
		this.validateRootPath(
			candidate.rootPath
		);

		validateCanonicalFilesystemPath(
			candidate.path,
			'path'
		);

		validateStrictDescendantPath(
			candidate.rootPath,
			candidate.path
		);

		return {
			rootPath:
				candidate.rootPath,
			path:
				candidate.path,
			descriptor:
				this.descriptorValidator.validate(
					candidate.descriptor
				)
		};
	}
}

/**
 * Ensures one Filesystem root or entry path is already canonical.
 *
 * Filesystem paths are application paths rather than operating-system absolute
 * paths, so they do not begin or end with `/` and may not contain empty, `.`, or
 * `..` segments.
 *
 * @param value Filesystem path supplied by Resource metadata or payload content.
 * @param name Contract field name used in validation errors.
 */
function validateCanonicalFilesystemPath(
	value: string,
	name: string
): void {
	if (
		value.length === 0 ||
		value.startsWith('/') ||
		value.endsWith('/') ||
		value.split('/')
			.some(
				(segment) =>
					segment.length === 0 ||
					segment === '.' ||
					segment === '..'
			)
	) {
		throw new Error(
			`Invalid Filesystem ${name}: ${value}`
		);
	}
}

/**
 * Requires a complete Filesystem entry path to be below, but not equal to, its root.
 *
 * @param rootPath Canonical Filesystem root supplied by Resource `f` metadata.
 * @param path Canonical complete Filesystem path supplied by the payload key.
 */
function validateStrictDescendantPath(
	rootPath: string,
	path: string
): void {
	if (
		!path.startsWith(
			`${rootPath}/`
		)
	) {
		throw new Error(
			`Filesystem path must be a strict descendant of rootPath: ${path} (${rootPath})`
		);
	}
}
