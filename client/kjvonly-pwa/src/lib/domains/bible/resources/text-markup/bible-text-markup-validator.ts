import {
	z
} from 'zod';

import type {
	BibleTextMarkupMap
} from '$lib/domains/bible/models/bible-text-markup.model';

import type {
	ResourceValidator
} from '$lib/resource/validation/resource-validator';

import type {
	BibleTextMarkupCandidate
} from './bible-text-markup-candidate';

import type {
	ValidatedBibleTextMarkupCandidate
} from './validated-bible-text-markup-candidate';

const markingSchema =
	z.object({
		class:
			z.array(
				z.string()
			)
	})
		.strict();

const wordMapSchema =
	z.record(
		z.string(),
		markingSchema
	);

const textMarkupMapSchema =
	z.record(
		z.string(),
		wordMapSchema
	);

export class BibleTextMarkupValidator
	implements ResourceValidator<
		BibleTextMarkupCandidate,
		ValidatedBibleTextMarkupCandidate
	> {

	validate(
		candidate:
			BibleTextMarkupCandidate
	): ValidatedBibleTextMarkupCandidate {
		validateChapterRef(
			candidate.chapterRef
		);

		const markings =
			textMarkupMapSchema.parse(
				candidate.value
			) as BibleTextMarkupMap;

		validateMarkingReferences(
			markings
		);

		return {
			name:
				candidate.name,

			chapterRef:
				candidate.chapterRef,

			markings
		};
	}
}

function validateChapterRef(
	chapterRef: string
): void {
	const match =
		/^(\d+)_(\d+)$/.exec(
			chapterRef
		);

	if (!match) {
		throw new Error(
			`Invalid Bible Text Markup chapter reference: ${chapterRef}`
		);
	}

	parseCanonicalPositiveInteger(
		match[1],
		`Invalid Bible Text Markup chapter reference: ${chapterRef}`
	);

	parseCanonicalPositiveInteger(
		match[2],
		`Invalid Bible Text Markup chapter reference: ${chapterRef}`
	);
}

function validateMarkingReferences(
	markings: BibleTextMarkupMap
): void {
	for (
		const [
			verse,
			words
		] of Object.entries(
			markings
		)
	) {
		parseCanonicalPositiveInteger(
			verse,
			`Invalid Bible Text Markup verse: ${verse}`
		);

		for (
			const wordIndex of
				Object.keys(
					words
				)
		) {
			parseCanonicalNonNegativeInteger(
				wordIndex,
				`Invalid Bible Text Markup word index: ${wordIndex}`
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
