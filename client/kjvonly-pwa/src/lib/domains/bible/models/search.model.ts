export interface SearchResult {
	key: string;
	bookName: string;
	number: number;
	verseNumber: number;
	text: string;
}

export type onFilterBibleLocationRefFunction = (
	bibleLocationReferences: string[]
) => string[];

export interface SearchResultResponse {
	id: string;
	text: string;
	bibleLocationRefs: string[];
	stats: SearchResultStats;
}

export function newSearchResultResponse(): SearchResultResponse {
	return {
		id: '',
		text: '',
		bibleLocationRefs: [],
		stats: newSearchResultStats()
	};
}

export interface SearchResultStats {
	count: number;
	time: string;
}

function newSearchResultStats(): SearchResultStats {
	return {
		count: 0,
		time: ''
	};
}
