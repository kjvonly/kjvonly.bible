export interface StrongsPopups {
	searchPopup: searchPopup | undefined;
}

export interface searchPopup {
	paneID: string;
	searchTerms: string;
	onFilterBibleLocationRefByBookID: (refs: string[]) => string[];
}

export function newStrongsPopups(): StrongsPopups {
	return {
		searchPopup: undefined
	};
}

export function newStrongs(): Strongs {
	return {
		number: '',
		originalWord: '',
		partsOfSpeech: '',
		phoneticSpelling: '',
		transliteratedWord: '',
		usageByBook: [],
		usageByWord: [],
		brownDef: {
			text: '',
			children: []
		},
		strongsDef: '',
		thayersDef: {
			text: '',
			children: []
		}
	};
}

export interface Strongs {
	number: string;
	originalWord: string;
	partsOfSpeech: string;
	phoneticSpelling: string;
	transliteratedWord: string;
	usageByBook: UsageBy[];
	usageByWord: UsageBy[];
	brownDef: BrownDef;
	strongsDef: string;
	thayersDef: ThayersDef;
}

interface ThayersDef {
	text: string;
	children: Child[];
}

interface Child {
	text: string;
	children: Child[];
}

export interface UsageBy {
	text: string;
	href: string[];
	class: string[];
}

interface BrownDef {
	text: string;
	children: Child[];
}
