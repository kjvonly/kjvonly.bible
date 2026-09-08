import {
	z
} from 'zod';

import type {
	ResourceValidator
} from '$lib/resource/validation/resource-validator';

import type {
	BibleChapterCandidate
} from './bible-chapter-candidate';

import type {
	ValidatedBibleChapterCandidate
} from './validated-bible-chapter-candidate';

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

export class BibleChapterValidator
	implements ResourceValidator<
		BibleChapterCandidate,
		ValidatedBibleChapterCandidate
	> {

	validate(
		candidate:
			BibleChapterCandidate
	): ValidatedBibleChapterCandidate {
		const content =
			chapterContentSchema.parse(
				candidate.value
			);

		validateChapterReference(
			candidate.chapterRef,
			content.number
		);

		validateVerseNumbers(
			content.verses
		);

		return {
			version:
				candidate.version,

			chapterRef:
				candidate.chapterRef,

			content
		};
	}
}

function validateChapterReference(
	chapterRef: string,
	chapterNumber: number
): void {
	const match =
		/^(\d+)_(\d+)$/.exec(
			chapterRef
		);

	if (!match) {
		throw new Error(
			`Invalid Bible Chapter reference: ${chapterRef}`
		);
	}

	const referenceChapterNumber =
		Number.parseInt(
			match[2],
			10
		);

	if (
		referenceChapterNumber !==
		chapterNumber
	) {
		throw new Error(
			`Bible Chapter reference does not match Chapter number: ${chapterRef}`
		);
	}
}

function validateVerseNumbers(
	verses:
		Record<
			string,
			{
				number: number;
			}
		>
): void {
	for (
		const [
			verseKey,
			verse
		]
		of Object.entries(
			verses
		)
	) {
		const verseNumber =
			Number.parseInt(
				verseKey,
				10
			);

		if (
			!Number.isInteger(
				verseNumber
			) ||
			String(
				verseNumber
			) !==
				verseKey ||
			verseNumber <=
				0
		) {
			throw new Error(
				`Invalid Bible verse key: ${verseKey}`
			);
		}

		if (
			verse.number !==
			verseNumber
		) {
			throw new Error(
				`Bible verse key does not match verse number: ${verseKey}`
			);
		}
	}
}