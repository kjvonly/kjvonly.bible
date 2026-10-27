export interface BiblePericopeWord {
	readonly text:
		string;

	readonly class:
		readonly string[] |
		null;

	readonly href:
		readonly string[] |
		null;

	readonly emphasis:
		boolean;
}

export interface BiblePericope {
	readonly text:
		string;

	readonly ref:
		string;

	readonly words:
		readonly BiblePericopeWord[];
}

export type BiblePericopeMap =
	Record<
		string,
		readonly BiblePericope[]
	>;

export interface BiblePericopes {
	readonly id:
		string;

	readonly chapterRef:
		string;

	readonly pericopes:
		BiblePericopeMap;
}

export function createBiblePericopesId(
	publisher: string,
	source: string,
	chapterRef: string
): string {
	return `${publisher}/${source}/${chapterRef}`;
}
