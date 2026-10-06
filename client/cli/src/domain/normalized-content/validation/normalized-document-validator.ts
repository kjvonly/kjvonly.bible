import {
	z
} from 'zod';

import type {
	NormalizedBlock,
	NormalizedFlowBlock
} from '../models/normalized-block.model.js';

import type {
	NormalizedContent
} from '../models/normalized-content.model.js';

import type {
	NormalizedDocument
} from '../models/normalized-document.model.js';

import {
	NORMALIZED_CLASS_NAMES,
	NORMALIZED_MARK_NAMES
} from '../vocabulary/normalized-presentation-vocabulary.js';

import {
	isSafeNormalizedLinkTarget
} from '../links/normalized-link-target.js';

/** Every canonical block/inline anchor has one non-blank document-local identity. */
const normalizedIDSchema =
	z.string()
		.refine(
			value =>
				value.trim().length > 0,
			{
				message:
					'Normalized block id must not be blank.'
			}
		);

/** Optional non-empty set of canonical presentation classes. */
const classSchema =
	z.array(
		z.enum(
			NORMALIZED_CLASS_NAMES
		)
	)
		.min(
			1
		)
		.refine(
			values =>
				new Set(
					values
				).size ===
					values.length,
			{
				message:
					'Normalized classes must not contain duplicates.'
			}
		)
		.optional();

/** Shared optional inline link-target collection. */
const hrefSchema =
	z.array(
		z.string()
			.refine(
				isSafeNormalizedLinkTarget,
				{
					message:
						'Normalized link target uses an unsafe executable URI scheme.'
				}
			)
	)
		.min(
			1
		)
		.optional();

/** Optional non-empty set of canonical inline semantic marks. */
const marksSchema =
	z.array(
		z.enum(
			NORMALIZED_MARK_NAMES
		)
	)
		.min(
			1
		)
		.refine(
			values =>
				new Set(
					values
				).size ===
					values.length,
			{
				message:
					'Normalized marks must not contain duplicates.'
			}
		)
		.optional();

/** Runtime schema for one normalized word unit. */
const wordSchema =
	z.object({
		type:
			z.literal(
				'word'
			),

		text:
			z.string()
				.min(
					1,
					'Normalized word text must not be empty.'
				)
				.refine(
					value =>
						!/\s/.test(
							value
						),
					{
						message:
							'Normalized word text must not contain whitespace.'
					}
				),

		joinPrevious:
			z.literal(
				true
			)
				.optional(),

		class:
			classSchema,

		href:
			hrefSchema,

		emphasis:
			z.literal(
				true
			)
				.optional(),

		strong:
			z.literal(
				true
			)
				.optional(),

		marks:
			marksSchema
	})
		.strict();

/** Runtime schema for one zero-width inline document-local target. */
const anchorSchema =
	z.object({
		type:
			z.literal(
				'anchor'
			),

		id:
			normalizedIDSchema
	})
		.strict();

/** Runtime schema for one explicit inline line boundary. */
const lineBreakSchema =
	z.object({
		type:
			z.literal(
				'line-break'
			)
	})
		.strict();

/** Runtime discriminated union for all canonical inline units. */
const normalizedContentSchema:
	z.ZodType<NormalizedContent> =
	z.discriminatedUnion(
		'type',
		[
			wordSchema,
			anchorSchema,
			lineBreakSchema
		]
	);

/** Ordered inline-content sequence reused by leaf text blocks. */
const inlineContentSchema =
	z.array(
		normalizedContentSchema
	)
		.superRefine(
			(content, context) => {
				content.forEach(
					(entry, index) => {
						if (
							entry.type !==
								'word' ||
							entry.joinPrevious !==
								true
						) {
							return;
						}

						if (
							hasPreviousVisibleWord(
								content,
								index
							)
						) {
							return;
						}

						context.addIssue({
							code:
								'custom',
							message:
								'joinPrevious requires a preceding visible word without an intervening line break.',
							path: [
								index,
								'joinPrevious'
							]
						});
					}
				);
			}
		);

/**
 * Returns whether `index` has a preceding visible word in the same horizontal run.
 *
 * Zero-width anchors do not break lexical continuity. A line break or the start of
 * content does, which makes `joinPrevious` invalid at that position.
 *
 * @param content Canonical inline sequence containing the word being validated.
 * @param index Index of the word whose `joinPrevious` relationship is being checked.
 * @returns True when a preceding visible word exists before any line-break boundary.
 */
function hasPreviousVisibleWord(
	content: readonly NormalizedContent[],
	index: number
): boolean {
	for (
		let candidateIndex = index - 1;
		candidateIndex >= 0;
		candidateIndex--
	) {
		const candidate =
			content[candidateIndex];

		if (!candidate) {
			continue;
		}

		if (
			candidate.type ===
				'anchor'
		) {
			continue;
		}

		return candidate.type ===
			'word';
	}

	return false;
}

/** Blocks legal in ordinary document flow, including the document root. */
const normalizedFlowBlockSchema:
	z.ZodType<NormalizedFlowBlock> =
	z.lazy(
		() => {
			const headingSchema =
				z.object({
					type:
						z.literal(
							'heading'
						),

					id:
						normalizedIDSchema,

					class:
						classSchema,

					level:
						z.union([
							z.literal(1),
							z.literal(2),
							z.literal(3),
							z.literal(4),
							z.literal(5),
							z.literal(6)
						]),

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
						normalizedIDSchema,

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
						normalizedIDSchema,

					class:
						classSchema,

					content:
						inlineContentSchema
				})
					.strict();

			const preformattedSchema =
				z.object({
					type:
						z.literal(
							'preformatted'
						),

					id:
						normalizedIDSchema,

					class:
						classSchema,

					content:
						inlineContentSchema
				})
					.strict();

			const thematicBreakSchema =
				z.object({
					type:
						z.literal(
							'thematic-break'
						),

					id:
						normalizedIDSchema,

					class:
						classSchema
				})
					.strict();

			const quoteSchema =
				z.object({
					type:
						z.literal(
							'quote'
						),

					id:
						normalizedIDSchema,

					class:
						classSchema,

					blocks:
						z.array(
							normalizedFlowBlockSchema
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
						normalizedIDSchema,

					class:
						classSchema,

					blocks:
						z.array(
							normalizedFlowBlockSchema
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
						normalizedIDSchema,

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

			const captionSchema =
				z.object({
					type:
						z.literal(
							'caption'
						),

					id:
						normalizedIDSchema,

					class:
						classSchema,

					blocks:
						z.array(
							normalizedFlowBlockSchema
						)
				})
					.strict();

			const tableCellSchema =
				z.object({
					type:
						z.literal(
							'table-cell'
						),

					id:
						normalizedIDSchema,

					class:
						classSchema,

					header:
						z.boolean(),

					blocks:
						z.array(
							normalizedFlowBlockSchema
						)
				})
					.strict();

			const tableRowSchema =
				z.object({
					type:
						z.literal(
							'table-row'
						),

					id:
						normalizedIDSchema,

					class:
						classSchema,

					blocks:
						z.array(
							tableCellSchema
						)
				})
					.strict();

			const tableSchema =
				z.object({
					type:
						z.literal(
							'table'
						),

					id:
						normalizedIDSchema,

					class:
						classSchema,

					blocks:
						z.array(
							z.union([
								captionSchema,
								tableRowSchema
							])
						)
				})
					.strict();

			const figureSchema =
				z.object({
					type:
						z.literal(
							'figure'
						),

					id:
						normalizedIDSchema,

					class:
						classSchema,

					blocks:
						z.array(
							z.union([
								normalizedFlowBlockSchema,
								captionSchema
							])
						)
				})
					.strict();

			return z.discriminatedUnion(
				'type',
				[
					headingSchema,
					paragraphSchema,
					textSchema,
					preformattedSchema,
					thematicBreakSchema,
					quoteSchema,
					listSchema,
					figureSchema,
					tableSchema
				]
			);
		}
	);

/** Runtime root schema; only ordinary flow blocks may appear at document level. */
const normalizedDocumentSchema:
	z.ZodType<NormalizedDocument> =
	z.object({
		source:
			z.string()
				.optional(),

		blocks:
			z.array(
				normalizedFlowBlockSchema
			)
	})
		.strict()
		.superRefine(
			(document, context) => {
				for (
					const duplicate of findDuplicateNormalizedIds(
						document
					)
				) {
					context.addIssue({
						code:
							'custom',
						message:
							`Duplicate normalized id: ${duplicate.id}`,
						path: [
							...duplicate.path,
							'id'
						]
					});
				}
			}
		);

/** One duplicate canonical ID plus the path where the repeated value occurs. */
interface DuplicateNormalizedId {
	id: string;
	path: Array<
		string | number
	>;
}

/**
 * Finds document-wide duplicate identity across blocks and zero-width inline
 * anchors. Block and anchor IDs share one DOM/document-local identity namespace.
 */
function findDuplicateNormalizedIds(
	document: NormalizedDocument
): DuplicateNormalizedId[] {
	const seen =
		new Set<string>();
	const duplicates:
		DuplicateNormalizedId[] = [];

	const record = (
		id: string,
		path: Array<
			string | number
		>
	): void => {
		if (
			seen.has(
				id
			)
		) {
			duplicates.push({
				id,
				path
			});
			return;
		}

		seen.add(
			id
		);
	};

	const visit = (
		block: NormalizedBlock,
		path: Array<
			string | number
		>
	): void => {
		if (
			typeof block.id ===
				'string'
		) {
			record(
				block.id,
				path
			);
		}

		if (
			'content' in block
		) {
			block.content.forEach(
				(entry, index) => {
					if (
						entry.type !==
							'anchor'
					) {
						return;
					}

					record(
						entry.id,
						[
							...path,
							'content',
							index
						]
					);
				}
			);
		}

		if (
			'blocks' in block
		) {
			block.blocks.forEach(
				(child, index) =>
					visit(
						child,
						[
							...path,
							'blocks',
							index
						]
					)
			);
		}
	};

	document.blocks.forEach(
		(block, index) =>
			visit(
				block,
				[
					'blocks',
					index
				]
			)
	);

	return duplicates;
}

/**
 * Strict runtime validator for the current canonical NormalizedDocument contract.
 *
 * Validation never repairs or drops fields. During development, retired shapes
 * are invalid and callers must provide current canonical data.
 */
export class NormalizedDocumentValidator {
	/**
	 * Returns the candidate as a canonical document or throws when any field is invalid.
	 *
	 * @param candidate Untrusted value that must already use the current canonical shape.
	 * @returns The validated canonical NormalizedDocument.
	 */
	validate(
		candidate: unknown
	): NormalizedDocument {
		return normalizedDocumentSchema.parse(
			candidate
		);
	}
}
