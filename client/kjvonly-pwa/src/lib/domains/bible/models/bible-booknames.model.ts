export interface BibleBooknames {
	readonly id:
		string;

	readonly booknamesById:
		Record<
			string,
			string
		>;

	readonly booknamesByName:
		Record<
			string,
			number
		>;

	readonly shortNames:
		Record<
			string,
			string
		>;

	readonly maxChapterById:
		Record<
			string,
			number
		>;

	readonly bookchapterversecountById:
		Record<
			string,
			Record<
				string,
				number
			>
		>;
}

export type BibleBooknamesContent =
	Omit<
		BibleBooknames,
		'id'
	>;

export function createBibleBooknamesId(
	publisher: string,
	key: string
): string {
	return `${publisher}/${key}`;
}
