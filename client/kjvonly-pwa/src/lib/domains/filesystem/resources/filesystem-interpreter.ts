import type {
	DecodedResourceContent,
	ResourceInterpreter
} from '$lib/resource';

import type {
	FilesystemEntryCandidate
} from './filesystem-entry-candidate';

export const FILESYSTEM_RESOURCE_TYPE =
	'fs';

/**
 * Interprets one decoded filesystem Resource as root-relative mapping
 * candidates.
 *
 * The Resource `f` metadata value supplies the filesystem root. Payload keys are
 * paths relative to that root. Target Resource descriptors are not resolved or
 * otherwise materialized during interpretation.
 */
export class FilesystemInterpreter
	implements ResourceInterpreter<
		FilesystemEntryCandidate
	> {

	readonly resourceType =
		FILESYSTEM_RESOURCE_TYPE;

	/** Interprets the path-keyed filesystem payload without resolving targets. */
	interpret(
		resource:
			DecodedResourceContent
	): Iterable<FilesystemEntryCandidate> {
		if (
			resource.resourceType !==
				this.resourceType
		) {
			throw new Error(
				`Invalid Filesystem Resource Type: ${resource.resourceType}`
			);
		}

		const rootPath =
			resource.metadata?.f;

		if (
			rootPath === undefined ||
			rootPath.length === 0
		) {
			throw new Error(
				'Filesystem Resource is missing f metadata.'
			);
		}

		if (!isRecord(resource.value)) {
			throw new Error(
				'Filesystem Resource content must be an object.'
			);
		}

		return Object.entries(
			resource.value
		).map(
			([path, value]) =>
				this.interpretEntry(
					rootPath,
					path,
					value
				)
		);
	}

	/** Interprets one root-relative payload entry while leaving validation later. */
	private interpretEntry(
		rootPath: string,
		path: string,
		value: unknown
	): FilesystemEntryCandidate {
		if (!isRecord(value)) {
			throw new Error(
				`Filesystem entry must be an object: ${path}`
			);
		}

		if (
			!Object.prototype
				.hasOwnProperty.call(
					value,
					'descriptor'
				)
		) {
			throw new Error(
				`Filesystem entry is missing descriptor: ${path}`
			);
		}

		return {
			rootPath,
			path,
			descriptor:
				value.descriptor
		};
	}
}

/** Returns true when a decoded JSON value is a non-array object. */
function isRecord(
	value: unknown
): value is Record<string, unknown> {
	return (
		typeof value ===
			'object' &&
		value !== null &&
		!Array.isArray(
			value
		)
	);
}
