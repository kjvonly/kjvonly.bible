import {
	z
} from 'zod';

import type {
	ResourceValidator
} from '$lib/resource/validation/resource-validator';

import type {
	NoteCandidate
} from './note-candidate';

import type {
	ValidatedNoteCandidate
} from './validated-note-candidate';

const noteTagSchema =
	z.object({
		id:
			z.string()
				.min(1),

		created:
			z.number()
				.finite()
				.nonnegative(),

		modified:
			z.number()
				.finite()
				.nonnegative(),

		tag:
			z.string()
	})
		.strict();

const noteSchema =
	z.object({
		bibleLocationRef:
			z.string()
				.min(1)
				.optional(),

		bibleReferenceText:
			z.string()
				.min(1)
				.optional(),

		text:
			z.string(),

		html:
			z.string(),

		title:
			z.string(),

		dateCreated:
			z.number()
				.finite()
				.nonnegative(),

		dateUpdated:
			z.number()
				.finite()
				.nonnegative(),

		tags:
			z.array(
				noteTagSchema
			)
	})
		.strict();

export class NoteValidator
	implements ResourceValidator<
		NoteCandidate,
		ValidatedNoteCandidate
	> {

	validate(
		candidate:
			NoteCandidate
	): ValidatedNoteCandidate {
		const parsed =
			noteSchema.parse(
				candidate.value
			);

		return {
			name:
				candidate.name,

			noteId:
				candidate.noteId,

			note: {
				bibleLocationRef:
					parsed.bibleLocationRef,

				bibleReferenceText:
					parsed.bibleReferenceText,

				text:
					parsed.text,

				html:
					parsed.html,

				title:
					parsed.title,

				dateCreated:
					parsed.dateCreated,

				dateUpdated:
					parsed.dateUpdated,

				tags:
					parsed.tags
			}
		};
	}
}
