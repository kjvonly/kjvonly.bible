import {
	z
} from 'zod';

import type {
	BiblePericopeMap
} from '$lib/domains/bible/models/bible-pericopes.model';

import type {
	ResourceValidator
} from '$lib/resource/validation/resource-validator';

import type {
	BiblePericopesCandidate
} from './bible-pericopes-candidate';

import type {
	ValidatedBiblePericopesCandidate
} from './validated-bible-pericopes-candidate';

const pericopeWordSchema =
	z.object({
		text:
			z.string().min(1),

		class:
			z.array(
				z.string().min(1)
			).min(1).nullable(),

		href:
			z.array(
				z.string().min(1)
			).min(1).nullable(),

		emphasis:
			z.boolean()
	}).strict();

const pericopeSchema =
	z.object({
		text:
			z.string().min(1),

		ref:
			z.string().min(1),

		words:
			z.array(
				pericopeWordSchema
			).min(1)
	}).strict();

const pericopeMapSchema =
	z.record(
		z.string(),
		z.array(
			pericopeSchema
		).min(1)
	);

export class BiblePericopesValidator
	implements ResourceValidator<
		BiblePericopesCandidate,
		ValidatedBiblePericopesCandidate
	> {

	validate(
		candidate:
			BiblePericopesCandidate
	): ValidatedBiblePericopesCandidate {
		const [
			bookId,
			chapterNumber
		] =
			validateChapterRef(
				candidate.chapterRef
			);

		const pericopes =
			pericopeMapSchema.parse(
				candidate.value
			) as BiblePericopeMap;

		validatePericopes(
			bookId,
			chapterNumber,
			candidate.chapterRef,
			pericopes
		);

		return {
			source:
				candidate.source,

			chapterRef:
				candidate.chapterRef,

			pericopes
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
			`Invalid Bible Pericopes chapter reference: ${chapterRef}`
		);
	}

	return [
		parseCanonicalPositiveInteger(
			match[1],
			`Invalid Bible Pericopes chapter reference: ${chapterRef}`
		),
		parseCanonicalPositiveInteger(
			match[2],
			`Invalid Bible Pericopes chapter reference: ${chapterRef}`
		)
	];
}

function validatePericopes(
	bookId: number,
	chapterNumber: number,
	chapterRef: string,
	pericopes: BiblePericopeMap
): void {
	for (
		const verseRef of
			Object.keys(
				pericopes
			)
	) {
		const entries =
			pericopes[
				verseRef
			];
		validateVerseRef(
			verseRef,
			bookId,
			chapterNumber,
			chapterRef
		);

		for (
			const pericope of entries
		) {
			if (
				pericope.ref !==
					verseRef
			) {
				throw new Error(
					`Bible Pericope ref does not match its Verse key: ${pericope.ref} !== ${verseRef}`
				);
			}

			for (
				const word of
					pericope.words
			) {
				if (
					word.href !==
						null
				) {
					for (
						const href of
							word.href
					) {
						validateCanonicalVerseRef(
							href,
							`Invalid Bible Pericope word href: ${href}`
						);
					}
				}
			}
		}
	}
}

function validateVerseRef(
	verseRef: string,
	bookId: number,
	chapterNumber: number,
	chapterRef: string
): void {
	const [
		verseBookId,
		verseChapterNumber
	] =
		validateCanonicalVerseRef(
			verseRef,
			`Invalid Bible Pericope Verse reference: ${verseRef}`
		);

	if (
		verseBookId !==
			bookId ||
		verseChapterNumber !==
			chapterNumber
	) {
		throw new Error(
			`Bible Pericope Verse does not belong to Chapter ${chapterRef}: ${verseRef}`
		);
	}
}

function validateCanonicalVerseRef(
	verseRef: string,
	errorMessage: string
): readonly [number, number, number] {
	const match =
		/^(\d+)_(\d+)_(\d+)$/.exec(
			verseRef
		);

	if (!match) {
		throw new Error(
			errorMessage
		);
	}

	return [
		parseCanonicalPositiveInteger(
			match[1],
			errorMessage
		),
		parseCanonicalPositiveInteger(
			match[2],
			errorMessage
		),
		parseCanonicalPositiveInteger(
			match[3],
			errorMessage
		)
	];
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
