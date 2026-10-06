import {
	z
} from 'zod';

import type {
	NormalizedBlock
} from '../models/normalized-block.model';

import type {
	NormalizedContent
} from '../models/normalized-content.model';

import type {
	NormalizedDocument
} from '../models/normalized-document.model';

const blockIDSchema =
	z.string()
		.nullable()
		.optional();

const classSchema =
	z.array(
		z.string()
	)
		.nullable()
		.optional();

const hrefSchema =
	z.array(
		z.string()
	)
		.nullable()
		.optional();

const marksSchema =
	z.array(
		z.string()
	)
		.nullable()
		.optional();

const wordSchema =
	z.object({
		type:
			z.literal(
				'word'
			),

		text:
			z.string(),

		class:
			classSchema,

		href:
			hrefSchema,

		emphasis:
			z.boolean()
				.optional(),

		strong:
			z.boolean()
				.optional(),

		marks:
			marksSchema
	})
		.strict();

const lineBreakSchema =
	z.object({
		type:
			z.literal(
				'line-break'
			)
	})
		.strict();

const normalizedContentSchema:
	z.ZodType<NormalizedContent> =
	z.discriminatedUnion(
		'type',
		[
			wordSchema,
			lineBreakSchema
		]
	);

const inlineContentSchema =
	z.array(
		normalizedContentSchema
	);

const normalizedBlockSchema:
	z.ZodType<NormalizedBlock> =
	z.lazy(
		() => {
			const headingSchema =
				z.object({
					type:
						z.literal(
							'heading'
						),

					id:
						blockIDSchema,

					class:
						classSchema,

					level:
						z.number()
							.int()
							.min(
								1
							)
							.max(
								6
							),

					content:
						inlineContentSchema
				})
					.strict();

			const paragraphSchema =
				z.object({
					type:
						z.literal(
							'paragraph'
						),

					id:
						blockIDSchema,

					class:
						classSchema,

					content:
						inlineContentSchema
				})
					.strict();

			const textSchema =
				z.object({
					type:
						z.literal(
							'text'
						),

					id:
						blockIDSchema,

					class:
						classSchema,

					content:
						inlineContentSchema
				})
					.strict();

			const quoteSchema =
				z.object({
					type:
						z.literal(
							'quote'
						),

					id:
						blockIDSchema,

					class:
						classSchema,

					blocks:
						z.array(
							normalizedBlockSchema
						)
				})
					.strict();

			const listItemSchema =
				z.object({
					type:
						z.literal(
							'list-item'
						),

					id:
						blockIDSchema,

					class:
						classSchema,

					blocks:
						z.array(
							normalizedBlockSchema
						)
				})
					.strict();

			const listSchema =
				z.object({
					type:
						z.literal(
							'list'
						),

					id:
						blockIDSchema,

					class:
						classSchema,

					ordered:
						z.boolean(),

					blocks:
						z.array(
							listItemSchema
						)
				})
					.strict();

			return z.discriminatedUnion(
				'type',
				[
					headingSchema,
					paragraphSchema,
					textSchema,
					quoteSchema,
					listSchema,
					listItemSchema
				]
			);
		}
	);

const normalizedDocumentSchema:
	z.ZodType<NormalizedDocument> =
	z.object({
		source:
			z.string()
				.optional(),

		blocks:
			z.array(
				normalizedBlockSchema
			)
	})
		.strict();

const normalizedBlockTypes =
	new Set([
		'heading',
		'paragraph',
		'text',
		'quote',
		'list',
		'list-item'
	]);

export class NormalizedDocumentValidator {
	validate(
		candidate: unknown
	): NormalizedDocument {
		return normalizedDocumentSchema.parse(
			removeLegacyBlockText(
				candidate
			)
		);
	}
}

function removeLegacyBlockText(
	value: unknown
): unknown {
	if (
		Array.isArray(
			value
		)
	) {
		return value.map(
			(item) =>
				removeLegacyBlockText(
					item
				)
		);
	}

	if (
		typeof value !==
			'object' ||
		value === null
	) {
		return value;
	}

	const record =
		value as Record<
			string,
			unknown
		>;

	const isNormalizedBlock =
		typeof record.type ===
			'string' &&
		normalizedBlockTypes.has(
			record.type
		);

	return Object.fromEntries(
		Object.entries(
			record
		)
			.filter(
				([key]) =>
					!(
						isNormalizedBlock &&
						key ===
							'text'
					)
			)
			.map(
				([
					key,
					item
				]) => [
					key,
					removeLegacyBlockText(
						item
					)
				]
			)
	);
}
