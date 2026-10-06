import type {
	ChapterContent
} from '../../models/bible.model';

/**
 * Applies Bible-specific invariants that require a Chapter reference as well as
 * structurally valid Chapter content.
 */
export function validateBibleChapterInvariants(
	chapterRef: string,
	content: ChapterContent
): void {
	validateChapterReference(
		chapterRef,
		content.number
	);

	validateVerseNumbers(
		content.verses
	);
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
