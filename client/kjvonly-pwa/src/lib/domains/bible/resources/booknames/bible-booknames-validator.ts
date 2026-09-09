import {
	z
} from 'zod';

import type {
	BibleBooknamesContent
} from '$lib/domains/bible/models/bible-booknames.model';

import type {
	ResourceValidator
} from '$lib/resource/validation/resource-validator';

import type {
	BibleBooknamesCandidate
} from './bible-booknames-candidate';

import type {
	ValidatedBibleBooknamesCandidate
} from './validated-bible-booknames-candidate';

const booknamesContentSchema =
	z.object({
		booknamesById:
			z.record(
				z.string(),
				z.string()
					.min(
						1
					)
			),

		booknamesByName:
			z.record(
				z.string(),
				z.number()
					.int()
					.positive()
			),

		shortNames:
			z.record(
				z.string(),
				z.string()
					.min(
						1
					)
			),

		maxChapterById:
			z.record(
				z.string(),
				z.number()
					.int()
					.positive()
			),

		bookchapterversecountById:
			z.record(
				z.string(),
				z.record(
					z.string(),
					z.number()
						.int()
						.positive()
				)
			)
	});

export class BibleBooknamesValidator
	implements ResourceValidator<
		BibleBooknamesCandidate,
		ValidatedBibleBooknamesCandidate
	> {

	validate(
		candidate:
			BibleBooknamesCandidate
	): ValidatedBibleBooknamesCandidate {
		const content:
			BibleBooknamesContent =
				booknamesContentSchema.parse(
					candidate.value
				);

		validateBookIds(
			content.booknamesById
		);

		validateBookMapKeys(
			content
		);

		validateBooknameInverse(
			content
		);

		validateShortNames(
			content.shortNames
		);

		validateChapterVerseCounts(
			content
		);

		return {
			key:
				candidate.key,

			content
		};
	}
}

function validateBookIds(
	booknamesById:
		Record<
			string,
			string
		>
): void {
	const bookIds =
		Object.keys(
			booknamesById
		);

	if (
		bookIds.length ===
		0
	) {
		throw new Error(
			'Bible Booknames content must contain at least one book.'
		);
	}

	for (
		const bookId of bookIds
	) {
		if (
			!isPositiveIntegerKey(
				bookId
			)
		) {
			throw new Error(
				`Invalid Bible Booknames book id: ${bookId}`
			);
		}
	}
}

function validateBookMapKeys(
	content:
		BibleBooknamesContent
): void {
	const expected =
		Object.keys(
			content.booknamesById
		);

	assertSameKeys(
		'Bible Booknames shortNames',
		expected,
		Object.keys(
			content.shortNames
		)
	);

	assertSameKeys(
		'Bible Booknames maxChapterById',
		expected,
		Object.keys(
			content.maxChapterById
		)
	);

	assertSameKeys(
		'Bible Booknames bookchapterversecountById',
		expected,
		Object.keys(
			content.bookchapterversecountById
		)
	);
}

function validateBooknameInverse(
	content:
		BibleBooknamesContent
): void {
	const bookIds =
		Object.keys(
			content.booknamesById
		);

	if (
		Object.keys(
			content.booknamesByName
		).length !==
		bookIds.length
	) {
		throw new Error(
			'Bible Booknames booknamesByName must be the inverse of booknamesById.'
		);
	}

	for (
		const bookId of bookIds
	) {
		const bookName =
			content.booknamesById[
				bookId
			];

		if (
			content.booknamesByName[
				bookName
			] !==
			Number(
				bookId
			)
		) {
			throw new Error(
				`Bible Booknames inverse mapping does not match for book id ${bookId}.`
			);
		}
	}

	for (
		const [
			bookName,
			bookId
		] of Object.entries(
			content.booknamesByName
		)
	) {
		if (
			content.booknamesById[
				String(
					bookId
				)
			] !==
			bookName
		) {
			throw new Error(
				`Bible Booknames inverse mapping does not match for book name ${bookName}.`
			);
		}
	}
}

function validateShortNames(
	shortNames:
		Record<
			string,
			string
		>
): void {
	const seen =
		new Set<
			string
		>();

	for (
		const shortName of Object.values(
			shortNames
		)
	) {
		if (
			seen.has(
				shortName
			)
		) {
			throw new Error(
				`Duplicate Bible Booknames short name: ${shortName}`
			);
		}

		seen.add(
			shortName
		);
	}
}

function validateChapterVerseCounts(
	content:
		BibleBooknamesContent
): void {
	for (
		const [
			bookId,
			maxChapter
		] of Object.entries(
			content.maxChapterById
		)
	) {
		const verseCounts =
			content
				.bookchapterversecountById[
					bookId
				];

		const chapterKeys =
			Object.keys(
				verseCounts
			);

		for (
			const chapterKey of chapterKeys
		) {
			if (
				!isPositiveIntegerKey(
					chapterKey
				)
			) {
				throw new Error(
					`Invalid Bible Booknames chapter key ${chapterKey} for book id ${bookId}.`
				);
			}
		}

		if (
			chapterKeys.length !==
			maxChapter
		) {
			throw new Error(
				`Bible Booknames chapter count does not match maxChapterById for book id ${bookId}.`
			);
		}

		for (
			let chapter = 1;
			chapter <= maxChapter;
			chapter++
		) {
			if (
				verseCounts[
					String(
						chapter
					)
				] ===
				undefined
			) {
				throw new Error(
					`Bible Booknames verse counts are missing chapter ${chapter} for book id ${bookId}.`
				);
			}
		}
	}
}

function assertSameKeys(
	label: string,
	expected:
		readonly string[],
	actual:
		readonly string[]
): void {
	if (
		expected.length !==
		actual.length
	) {
		throw new Error(
			`${label} keys do not match booknamesById.`
		);
	}

	const actualKeys =
		new Set(
			actual
		);

	for (
		const key of expected
	) {
		if (
			!actualKeys.has(
				key
			)
		) {
			throw new Error(
				`${label} keys do not match booknamesById.`
			);
		}
	}
}

function isPositiveIntegerKey(
	value: string
): boolean {
	const number =
		Number.parseInt(
			value,
			10
		);

	return (
		Number.isInteger(
			number
		) &&
		number > 0 &&
		String(
			number
		) ===
		value
	);
}
