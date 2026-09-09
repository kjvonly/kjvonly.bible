import {
	z
} from 'zod';

import type {
	BibleParagraphMap
} from '$lib/domains/bible/models/bible-paragraphs.model';

import type {
	ResourceValidator
} from '$lib/resource/validation/resource-validator';

import type {
	BibleParagraphsCandidate
} from './bible-paragraphs-candidate';

import type {
	ValidatedBibleParagraphsCandidate
} from './validated-bible-paragraphs-candidate';

const paragraphMapSchema =
	z.record(
		z.string(),
		z.object({})
			.strict()
	);

export class BibleParagraphsValidator
	implements ResourceValidator<
		BibleParagraphsCandidate,
		ValidatedBibleParagraphsCandidate
	> {

	validate(
		candidate:
			BibleParagraphsCandidate
	): ValidatedBibleParagraphsCandidate {
		validateChapterRef(
			candidate.chapterRef
		);

		const paragraphs:
			BibleParagraphMap =
			candidate.value ===
				null
				? {}
				: paragraphMapSchema.parse(
					candidate.value
				) as BibleParagraphMap;

		validateParagraphMarkers(
			candidate.chapterRef,
			paragraphs
		);

		return {
			source:
				candidate.source,

			chapterRef:
				candidate.chapterRef,

			paragraphs
		};
	}
}

function validateChapterRef(
	chapterRef: string
): readonly [number, number] {
	const match =
		/^(\d+)_(\d+)$/.exec(
			chapterRef
		);

	if (!match) {
		throw new Error(
			`Invalid Bible Paragraphs chapter reference: ${chapterRef}`
		);
	}

	const bookId =
		parseCanonicalPositiveInteger(
			match[1],
			`Invalid Bible Paragraphs chapter reference: ${chapterRef}`
		);

	const chapterNumber =
		parseCanonicalPositiveInteger(
			match[2],
			`Invalid Bible Paragraphs chapter reference: ${chapterRef}`
		);

	return [
		bookId,
		chapterNumber
	];
}

function validateParagraphMarkers(
	chapterRef: string,
	paragraphs: BibleParagraphMap
): void {
	const [
		bookId,
		chapterNumber
	] =
		validateChapterRef(
			chapterRef
		);

	for (
		const markerRef of
			Object.keys(
				paragraphs
			)
	) {
		const match =
			/^(\d+)_(\d+)_(\d+)_(\d+)$/.exec(
				markerRef
			);

		if (!match) {
			throw new Error(
				`Invalid Bible Paragraph marker reference: ${markerRef}`
			);
		}

		const markerBookId =
			parseCanonicalPositiveInteger(
				match[1],
				`Invalid Bible Paragraph marker reference: ${markerRef}`
			);

		const markerChapterNumber =
			parseCanonicalPositiveInteger(
				match[2],
				`Invalid Bible Paragraph marker reference: ${markerRef}`
			);

		parseCanonicalPositiveInteger(
			match[3],
			`Invalid Bible Paragraph marker reference: ${markerRef}`
		);

		parseCanonicalNonNegativeInteger(
			match[4],
			`Invalid Bible Paragraph marker reference: ${markerRef}`
		);

		if (
			markerBookId !==
				bookId ||
			markerChapterNumber !==
				chapterNumber
		) {
			throw new Error(
				`Bible Paragraph marker does not belong to Chapter ${chapterRef}: ${markerRef}`
			);
		}
	}
}

function parseCanonicalPositiveInteger(
	value: string,
	errorMessage: string
): number {
	const parsed =
		Number.parseInt(
			value,
			10
		);

	if (
		parsed <= 0 ||
		String(parsed) !==
			value
	) {
		throw new Error(
			errorMessage
		);
	}

	return parsed;
}

function parseCanonicalNonNegativeInteger(
	value: string,
	errorMessage: string
): number {
	const parsed =
		Number.parseInt(
			value,
			10
		);

	if (
		parsed < 0 ||
		String(parsed) !==
			value
	) {
		throw new Error(
			errorMessage
		);
	}

	return parsed;
}
