import type {
	DecodedResourceContent
} from '$lib/resource';

import type {
	ResourceInterpreter
} from '$lib/resource';

import {
	parseResourceIdentifier
} from '$lib/resource';

import type {
	NoteCandidate
} from './note-candidate';

import {
	NOTE_DATA_TYPE_V1,
	NOTES_RESOURCE_TYPE
} from './notes-resource-contract';

export class NoteInterpreter
	implements ResourceInterpreter<
		NoteCandidate
	> {

	readonly resourceType =
		NOTES_RESOURCE_TYPE;

	interpret(
		resource:
			DecodedResourceContent
	): Iterable<NoteCandidate> {
		if (
			resource.resourceType !==
			this.resourceType
		) {
			throw new Error(
				`Invalid Notes Resource Type: ${resource.resourceType}`
			);
		}

		validateNoteDataType(
			resource.dataType
		);

		const identifier =
			parseResourceIdentifier(
				resource.resourceId
			);

		if (
			identifier.resourceType !==
			this.resourceType
		) {
			throw new Error(
				`Invalid Notes Resource Identifier: ${resource.resourceId}`
			);
		}

		if (
			identifier.path.length ===
			0
		) {
			throw new Error(
				'Notes Resource root is not supported.'
			);
		}

		if (
			identifier.path.length ===
			2
		) {
			const [
				name,
				noteId
			] = identifier.path;

			validateNoteId(
				noteId
			);

			return [
				{
					name,
					noteId,
					value:
						resource.value
				}
			];
		}

		if (
			identifier.path.length !==
			1
		) {
			throw new Error(
				`Invalid Notes Resource path: ${resource.resourceId}`
			);
		}

		const [
			name
		] = identifier.path;

		if (
			!isRecord(
				resource.value
			)
		) {
			throw new Error(
				'Notes bundle content must be an object.'
			);
		}

		return Object.entries(
			resource.value
		).map(
			([
				noteId,
				value
			]) => {
				validateNoteId(
					noteId
				);

				return {
					name,
					noteId,
					value
				};
			}
		);
	}
}


/**
 * Requires the semantic Notes schema version currently supported by the app.
 */
function validateNoteDataType(
	dataType: string |
		undefined
): void {
	if (
		dataType === undefined
	) {
		throw new Error(
			'Notes data type is required.'
		);
	}

	if (
		dataType !== NOTE_DATA_TYPE_V1
	) {
		throw new Error(
			`Unsupported Notes data type: ${dataType}`
		);
	}
}

function validateNoteId(
	noteId: string
): void {
	if (
		noteId.length === 0 ||
		noteId.includes('/')
	) {
		throw new Error(
			`Invalid Note Resource id: ${noteId}`
		);
	}
}

function isRecord(
	value: unknown
): value is Record<string, unknown> {
	return (
		typeof value ===
			'object' &&
		value !==
			null &&
		!Array.isArray(
			value
		)
	);
}
