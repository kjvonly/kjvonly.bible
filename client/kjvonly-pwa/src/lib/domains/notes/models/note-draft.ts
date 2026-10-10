import type {
	Note
} from './note.model';

interface NewNoteDraftBase {
	id: string;
	now: number;
}

export type NewNoteDraftInput =
	| (NewNoteDraftBase & {
		kind: 'standalone';
	})
	| (NewNoteDraftBase & {
		kind: 'chapter';
		bibleLocationRef: string;
		bookName: string;
		chapterNumber: number;
	})
	| (NewNoteDraftBase & {
		kind: 'verse';
		bibleLocationRef: string;
		bookName: string;
		chapterNumber: number;
		verseNumber: number;
		wordIndex: number;
		verseText: string;
	});

/**
 * Creates the editor-local Note draft for one explicit Note location.
 *
 * Chapter drafts intentionally contain no verse quotation because no verse was
 * selected. Verse and word drafts preserve the existing verse-derived initial
 * content.
 *
 * @param input - Draft identity and optional Bible-location metadata.
 * @returns A transient Note ready for the Notes editor.
 */
export function createNewNoteDraft(
	input: NewNoteDraftInput
): Note {
	switch (input.kind) {
		case 'standalone':
			return createNote(
				input,
				{
					bibleLocationRef: undefined,
					bibleReferenceText: undefined,
					text: '',
					html: '',
					title: 'Note'
				}
			);

		case 'chapter': {
			const title =
				`${input.bookName} ${input.chapterNumber}`;

			return createNote(
				input,
				{
					bibleLocationRef:
						input.bibleLocationRef,
					bibleReferenceText:
						title,
					text: `${title}\n`,
					html: `<h1>${title}</h1><p></p>`,
					title
				}
			);
		}

		case 'verse': {
			const wordSuffix =
				input.wordIndex > 0
					? `:${input.wordIndex}`
					: '';
			const bibleReferenceText =
				`${input.bookName} ${input.chapterNumber}:${input.verseNumber}`;
			const title =
				`${bibleReferenceText}${wordSuffix}`;

			return createNote(
				input,
				{
					bibleLocationRef:
						input.bibleLocationRef,
					bibleReferenceText,
					text:
						`${title}\n${input.verseText}`,
					html:
						`<h1>${title}</h1><p><italic>${input.verseText}</italic></p>`,
					title
				}
			);
		}
	}
}

/** Adds shared Note identity/timestamps to location-specific draft content. */
function createNote(
	input: NewNoteDraftBase,
	content: Pick<
		Note,
		| 'bibleLocationRef'
		| 'bibleReferenceText'
		| 'text'
		| 'html'
		| 'title'
	>
): Note {
	return {
		id: input.id,
		...content,
		dateCreated: input.now,
		dateUpdated: input.now,
		tags: []
	};
}
