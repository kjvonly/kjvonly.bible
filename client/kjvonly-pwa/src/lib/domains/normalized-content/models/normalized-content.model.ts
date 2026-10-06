export interface NormalizedWord {
	type: 'word';
	text: string;
	class?: string[] | null;
	href?: string[] | null;
	emphasis?: boolean;
	strong?: boolean;
	marks?: string[] | null;
}

export interface NormalizedLineBreak {
	type: 'line-break';
}

export type NormalizedContent =
	| NormalizedWord
	| NormalizedLineBreak;
