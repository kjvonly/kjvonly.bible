export type BibleParagraphMarker =
	Record<
		string,
		never
	>;

export type BibleParagraphMap =
	Record<
		string,
		BibleParagraphMarker
	>;

export interface BibleParagraphs {
	readonly id:
		string;

	readonly chapterRef:
		string;

	readonly paragraphs:
		BibleParagraphMap;
}

export function createBibleParagraphsId(
	publisher: string,
	source: string,
	chapterRef: string
): string {
	return `${publisher}/${source}/${chapterRef}`;
}
