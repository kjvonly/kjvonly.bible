import {
	z
} from 'zod';

import type {
	ResourceDataTypeHandler
} from '$lib/resource';

import type {
	NoteTag,
	NormalizedDocumentNoteAssociation
} from '../models/note.model';

import {
	NOTE_DATA_TYPE,
	NOTE_DATA_VERSION
} from './notes-resource-contract';

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

const baseNoteContentSchema =
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


const normalizedDocumentIdentitySchema =
	z.object({
		publisher: z.string().min(1),
		resourceId: z.string().min(1)
	}).strict();

const normalizedDocumentAssociationSchema =
	z.object({
		kind: z.literal('normalized-document'),
		document: normalizedDocumentIdentitySchema,
		target: z.discriminatedUnion('kind', [
			z.object({ kind: z.literal('document') }).strict(),
			z.object({
				kind: z.literal('word'),
				address: z.object({
					blockId: z.string().min(1),
					contentIndex: z.number().int().nonnegative()
				}).strict()
			}).strict()
		])
	}).strict();

const noteContentSchema =
	baseNoteContentSchema.extend({
		association: normalizedDocumentAssociationSchema.optional()
	}).superRefine((note, context) => {
		if (
			note.association !== undefined &&
			(note.bibleLocationRef !== undefined ||
				note.bibleReferenceText !== undefined)
		) {
			context.addIssue({
				code: 'custom',
				message: 'Normalized document Notes cannot also have Bible associations',
				path: ['association']
			});
		}
	});

export interface NoteResourceContent {
	readonly bibleLocationRef:
		string |
		undefined;

	readonly bibleReferenceText:
		string |
		undefined;

	readonly association?: NormalizedDocumentNoteAssociation;

	readonly text:
		string;

	readonly html:
		string;

	readonly title:
		string;

	readonly dateCreated:
		number;

	readonly dateUpdated:
		number;

	readonly tags:
		NoteTag[];
}

export type NoteResourceData =
	| NoteResourceContent
	| Readonly<
		Record<
			string,
			NoteResourceContent
		>
	>;

/** The current strict Note payload, including optional normalized associations. */
export class NoteDataTypeHandler
	implements ResourceDataTypeHandler<NoteResourceData> {

	readonly dataType = NOTE_DATA_TYPE;
	readonly dataVersion = NOTE_DATA_VERSION;

	validate(value: unknown): NoteResourceData {
		const single = noteContentSchema.safeParse(value);

		if (single.success) {
			return createNoteContent(single.data);
		}

		const bundle = z.record(z.string(), noteContentSchema).parse(value);

		return Object.fromEntries(
			Object.entries(bundle).map(([noteId, note]) => [
				noteId,
				createNoteContent(note)
			])
		);
	}
}

export function isNoteResourceContent(
	value: unknown
): value is NoteResourceContent {
	if (
		typeof value !==
			'object' ||
		value ===
			null
	) {
		return false;
	}

	const candidate =
		value as Record<
			string,
			unknown
		>;

	return (
		typeof candidate.title ===
			'string' &&
		typeof candidate.text ===
			'string' &&
		typeof candidate.html ===
			'string' &&
		typeof candidate.dateCreated ===
			'number' &&
		typeof candidate.dateUpdated ===
			'number' &&
		Array.isArray(
			candidate.tags
		)
	);
}

function createNoteContent(
	value:
		z.infer<
			typeof noteContentSchema
		>
): NoteResourceContent {
	return {
		bibleLocationRef:
			value.bibleLocationRef,

		bibleReferenceText:
			value.bibleReferenceText,

		...(value.association !== undefined
			? { association: value.association }
			: {}),

		text:
			value.text,

		html:
			value.html,

		title:
			value.title,

		dateCreated:
			value.dateCreated,

		dateUpdated:
			value.dateUpdated,

		tags:
			value.tags
	};
}
