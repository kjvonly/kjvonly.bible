export interface chapter {
	number: number;
	bookName: string;
	verses: Map<string, verse>;
	verseMap: Map<string, string>;
	footnotes: Map<string, string>;
}
interface verse {
	number: number;
	words: word[];
	text: string;
}

interface word {
	text: string;
	class: string[] | null;
	href: string[] | null;
	emphasis: boolean;
}
