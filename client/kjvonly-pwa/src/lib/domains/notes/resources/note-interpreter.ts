import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceInterpreter
} from '$lib/resource/interpretation/resource-interpreter';

import {
	parseResourceIdentifier
} from '$lib/resource/utils/resource-identifier';

import type {
	NoteCandidate
} from './note-candidate';

export const NOTES_RESOURCE_TYPE =
	'kjvonly/notes/entries';

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
