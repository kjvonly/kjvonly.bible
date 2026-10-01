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

	/** Validates one root-relative mapping and returns its trusted descriptor. */
	validate(
		candidate:
			FilesystemEntryCandidate
	): ValidatedFilesystemEntryCandidate {
		validateRelativePath(
			candidate.rootPath,
			'rootPath'
		);

		validateRelativePath(
			candidate.path,
			'path'
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

/** Ensures filesystem roots and entry paths are normalized relative paths. */
function validateRelativePath(
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
