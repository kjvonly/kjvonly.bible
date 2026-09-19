import type {
	KJVOnlyArchiveImportResult
} from '../kjvonly-archive-importer';

export type KJVOnlyArchiveWorkerRequest =
	| KJVOnlyArchiveWorkerImportRequest
	| KJVOnlyArchiveWorkerExportRequest;

export interface KJVOnlyArchiveWorkerImportRequest {
	readonly type:
		'import';

	readonly value:
		Uint8Array;
}

export interface KJVOnlyArchiveWorkerExportRequest {
	readonly type:
		'export';

	readonly objectTypes:
		readonly string[];
}

export type KJVOnlyArchiveWorkerMessage =
	| KJVOnlyArchiveWorkerImportResultMessage
	| KJVOnlyArchiveWorkerExportResultMessage
	| KJVOnlyArchiveWorkerErrorMessage;

export interface KJVOnlyArchiveWorkerImportResultMessage {
	readonly type:
		'import-result';

	readonly result:
		KJVOnlyArchiveImportResult;
}

export interface KJVOnlyArchiveWorkerExportResultMessage {
	readonly type:
		'export-result';

	readonly value:
		Uint8Array;
}

export interface KJVOnlyArchiveWorkerErrorMessage {
	readonly type:
		'error';

	readonly error:
		SerializedKJVOnlyArchiveWorkerError;
}

export interface SerializedKJVOnlyArchiveWorkerError {
	readonly name:
		string;

	readonly message:
		string;

	readonly stack?:
		string;
}

export function serializeKJVOnlyArchiveWorkerError(
	error: unknown
): SerializedKJVOnlyArchiveWorkerError {
	if (error instanceof Error) {
		return {
			name:
				error.name,
			message:
				error.message,
			...(
				error.stack !== undefined
					? {
							stack:
								error.stack
						}
					: {}
			)
		};
	}

	return {
		name:
			'Error',
		message:
			String(
				error
			)
	};
}

export function deserializeKJVOnlyArchiveWorkerError(
	error:
		SerializedKJVOnlyArchiveWorkerError
): Error {
	const result =
		new Error(
			error.message
		);

	result.name =
		error.name;

	if (
		error.stack !== undefined
	) {
		result.stack =
			error.stack;
	}

	return result;
}
