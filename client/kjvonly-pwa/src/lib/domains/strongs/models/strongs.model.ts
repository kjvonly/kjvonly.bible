export interface StrongsPopups {
	searchPopup:
		searchPopup |
		undefined;
}

export interface searchPopup {
	paneID:
		string;

	searchTerms:
		string;

	onFilterBibleLocationRefByBookID:
		(
			refs: string[]
		) => string[];
}

export function newStrongsPopups():
	StrongsPopups {

	return {
		searchPopup:
			undefined
	};
}

export interface Strongs {
	id:
		string;

	number:
		string;

	originalWord:
		string;

	partsOfSpeech:
		string;

	phoneticSpelling:
		string;

	transliteratedWord:
		string;

	usageByBook:
		UsageBy[];

	usageByWord:
		UsageBy[];

	brownDef:
		BrownDef |
		null;

	strongsDef:
		string;

	thayersDef:
		ThayersDef |
		null;
}

export type StrongsContent =
	Omit<
		Strongs,
		'id'
	>;

export interface UsageBy {
	text:
		string;

	href:
		string[];

	class:
		string[];
}

interface BrownDef {
	text:
		string;

	children:
		Child[] |
		null;
}

interface ThayersDef {
	text:
		string;

	children:
		Child[] |
		null;
}

interface Child {
	text:
		string;

	children:
		Child[] |
		null;
}

export function newStrongs():
	Strongs {

	return {
		id:
			'',

		number:
			'',

		originalWord:
			'',

		partsOfSpeech:
			'',

		phoneticSpelling:
			'',

		transliteratedWord:
			'',

		usageByBook:
			[],

		usageByWord:
			[],

		brownDef:
			null,

		strongsDef:
			'',

		thayersDef:
			null
	};
}