import {
	z
} from 'zod';

import type {
	ChapterContent
} from '../../models/bible.model';

import type {
	ResourceDataTypeHandler
} from '$lib/resource';

import {
	BIBLE_CHAPTER_DATA_TYPE,
	BIBLE_CHAPTER_DATA_VERSION
} from './bible-chapter-resource';

const wordSchema =
	z.object({
		text:
			z.string(),

		class:
			z.array(
				z.string()
			)
				.nullable(),

		href:
			z.array(
				z.string()
			)
				.nullable(),

		emphasis:
			z.boolean()
	});

const verseSchema =
	z.object({
		number:
			z.number()
				.int()
				.positive(),

		words:
			z.array(
				wordSchema
			),

		text:
			z.string()
	});

const chapterContentSchema =
	z.object({
		number:
			z.number()
				.int()
				.positive(),

		bookName:
			z.string()
				.min(
					1
				),

		verses:
			z.record(
				z.string(),
				verseSchema
			),

		verseMap:
			z.record(
				z.string(),
				z.string()
			),

		footnotes:
			z.record(
				z.string(),
				z.string()
			)
	});

const chapterBundleSchema =
	z.record(
		z.string(),
		chapterContentSchema
	);

export type BibleChapterResourceData =
	| ChapterContent
	| Readonly<Record<
		string,
		ChapterContent
	>>;

export function isBibleChapterContent(
	value: BibleChapterResourceData
): value is ChapterContent {
	return (
		typeof value ===
			'object' &&
		value !==
			null &&
		!Array.isArray(
			value
		) &&
		typeof (value as ChapterContent).number ===
			'number' &&
		typeof (value as ChapterContent).bookName ===
			'string'
	);
}

/**
 * Validates the structural payload contract carried by Bible Chapter Resources.
 *
 * This layer deliberately does not interpret Resource ID, `bibleId`,
 * Chapter references, or the semantic Bible version in Resource metadata.
 * Those rules belong to the Bible Domain-object factory.
 */
export class BibleChapterDataTypeHandler
	implements ResourceDataTypeHandler<BibleChapterResourceData> {

	readonly dataType =
		BIBLE_CHAPTER_DATA_TYPE;

	readonly dataVersion =
		BIBLE_CHAPTER_DATA_VERSION;

	validate(
		value: unknown
	): BibleChapterResourceData {
		return z.union([
			chapterContentSchema,
			chapterBundleSchema
		])
			.parse(
				value
			) as BibleChapterResourceData;
	}
}


export function validateBibleChapterContent(
	value: unknown
): ChapterContent {
	return chapterContentSchema.parse(
		value
	) as ChapterContent;
}
