export interface BibleTextMarkupMarking {
	class:
		string[];
}

export type BibleTextMarkupWordMap =
	Record<
		string,
		BibleTextMarkupMarking
	>;

export type BibleTextMarkupMap =
	Record<
		string,
		BibleTextMarkupWordMap
	>;

export interface BibleTextMarkup {
	readonly id:
		string;

	readonly chapterRef:
		string;

	readonly markings:
		BibleTextMarkupMap;
}

export function createBibleTextMarkupId(
	publisher: string,
	name: string,
	chapterRef: string
): string {
	return `${publisher}/${name}/${chapterRef}`;
}
