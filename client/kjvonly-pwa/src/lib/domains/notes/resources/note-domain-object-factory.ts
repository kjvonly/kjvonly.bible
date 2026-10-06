import {
	type ResourceDomainObjectCandidate,
	type ResourceDomainObjectFactory,
	type ResourceDomainObjectFactoryContext
} from '$lib/resource';

import type {
	Note
} from '../models/note.model';

import {
	NOTE_OBJECT_TYPE,
	createNoteId
} from '../models/note-id';

import {
	isNoteResourceContent,
	type NoteResourceContent,
	type NoteResourceData
} from './note-data-type-handler';

import {
	NOTE_DATA_TYPE,
	NOTES_RESOURCE_TYPE
} from './notes-resource-contract';

import {
	parseNotesResourceId
} from './notes-resource-id';

/**
 * Gives accepted Note Resource values their Domain identities.
 *
 * An individual Resource produces one Note while a named bundle may produce
 * many. Semantic payload validation has already completed before this factory
 * is called.
 */
export class NoteDomainObjectFactory
	implements ResourceDomainObjectFactory {

	readonly resourceType =
		NOTES_RESOURCE_TYPE;

	create(
		resource:
			ResourceDomainObjectFactoryContext,

		value: unknown
	): readonly ResourceDomainObjectCandidate[] {
		const identity =
			parseNotesResourceId(
				resource.resourceId
			);

		const accepted =
			value as NoteResourceData;

		if (
			identity.noteId !==
				undefined
		) {
			const {
				name,
				noteId
			} = identity;

			if (
				!isNoteResourceContent(
					accepted
				)
			) {
				throw new Error(
					'Individual Notes Resource must contain one Note.'
				);
			}

			return [
				this.createCandidate(
					resource.publisher,
					name,
					noteId,
					accepted
				)
			];
		}

		const {
			name
		} = identity;

		if (
			isNoteResourceContent(
				accepted
			)
		) {
			throw new Error(
				'Notes bundle Resource must contain a Note map.'
			);
		}

		return Object.entries(
			accepted
		).map(
			([noteId, note]) =>
				this.createCandidate(
					resource.publisher,
					name,
					noteId,
					note
				)
		);
	}

	private createCandidate(
		publisher: string,
		name: string,
		noteId: string,
		content: NoteResourceContent
	): ResourceDomainObjectCandidate {
		validateNoteId(
			noteId
		);

		const id =
			createNoteId(
				publisher,
				name,
				noteId
			);

		const note:
			Note = {
				id,
				...content
			};

		return {
			objectType:
				NOTE_OBJECT_TYPE,


			objectId:
				id,

			dataType:
				NOTE_DATA_TYPE,

			dataVersion:
				1,

			value:
				note
		};
	}
}

function validateNoteId(
	noteId: string
): void {
	if (
		noteId.length ===
			0 ||
		noteId.includes('/')
	) {
		throw new Error(
			`Invalid Note Resource id: ${noteId}`
		);
	}
}
