export interface BibleSearchIndexChunks {
	readonly reg:
		string;

	readonly cfg:
		string;

	readonly map:
		string;

	readonly ctx:
		string;

	readonly [key: string]:
		string;
}

export interface BibleSearchIndex {
	readonly id:
		string;

	readonly version:
		string;

	readonly chunks:
		BibleSearchIndexChunks;
}

export function createBibleSearchIndexId(
	publisher: string,
	version: string
): string {
	return `${publisher}/${version}`;
}
