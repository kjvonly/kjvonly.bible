import type {
	ResourceDataTypeHandler
} from '$lib/resource';

import {
	FILESYSTEM_ENTRIES_DATA_TYPE,
	FILESYSTEM_ENTRIES_DATA_VERSION,
	type FilesystemEntriesResourceData,
	type FilesystemEntriesResourceEntry
} from './filesystem-resource';

/** Validates the semantic path-keyed Filesystem entry payload contract. */
export class FilesystemEntriesDataTypeHandler
	implements ResourceDataTypeHandler<FilesystemEntriesResourceData> {

	readonly dataType =
		FILESYSTEM_ENTRIES_DATA_TYPE;

	readonly dataVersion =
		FILESYSTEM_ENTRIES_DATA_VERSION;

	/**
	 * Validates only the path-keyed Filesystem payload shape.
	 * Descriptor semantics and path placement are validated by later boundaries.
	 *
	 * @param value Untrusted decoded semantic Resource value.
	 */
	validate(
		value: unknown
	): FilesystemEntriesResourceData {
		if (!isRecord(value)) {
			throw new Error(
				'Filesystem Resource content must be an object.'
			);
		}

		return Object.fromEntries(
			Object.entries(value)
				.map(
					([path, entry]) => [
						path,
						validateEntry(
							path,
							entry
						)
					]
				)
		);
	}
}

/** Validates only Filesystem payload shape; descriptor semantics are validated later. */
function validateEntry(
	path: string,
	value: unknown
): FilesystemEntriesResourceEntry {
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
		descriptor:
			value.descriptor
	};
}

function isRecord(
	value: unknown
): value is Record<string, unknown> {
	return (
		typeof value ===
			'object' &&
		value !== null &&
		!Array.isArray(value)
	);
}
