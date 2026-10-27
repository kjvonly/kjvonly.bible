import type {
	DecodedResourceContent
} from '$lib/resource';

import type {
	FilesystemEntryCandidate
} from './filesystem-entry-candidate';

import {
	FILESYSTEM_RESOURCE_TYPE,
	type FilesystemEntriesResourceData
} from './filesystem-resource';

/** Decoded Resource whose semantic value satisfies the Filesystem payload shape. */
export type DecodedFilesystemResourceContent =
	Omit<DecodedResourceContent, 'value'> & {
		readonly value:
			FilesystemEntriesResourceData;
	};

/**
 * Interprets one decoded filesystem Resource as full-path mapping candidates.
 *
 * The Resource `f` metadata value supplies the filesystem root. Payload keys are
 * complete filesystem paths that include that root. Target Resource descriptors
 * are not resolved or loaded during interpretation.
 */
export class FilesystemInterpreter {

	readonly resourceType =
		FILESYSTEM_RESOURCE_TYPE;

	/**
	 * Interprets the path-keyed Filesystem payload without resolving targets.
	 *
	 * @param resource Decoded Filesystem Resource with validated payload shape.
	 */
	interpret(
		resource:
			DecodedFilesystemResourceContent
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

	/** Interprets one full-path payload entry while leaving placement validation later. */
	private interpretEntry(
		rootPath: string,
		path: string,
		value: FilesystemEntriesResourceData[string]
	): FilesystemEntryCandidate {
		return {
			rootPath,
			path,
			descriptor:
				value.descriptor
		};
	}
}
