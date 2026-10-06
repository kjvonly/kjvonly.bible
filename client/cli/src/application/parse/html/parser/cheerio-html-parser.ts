import {
	load
} from 'cheerio';

import type {
	CheerioAPI
} from 'cheerio';

import type {
	Element
} from 'domhandler';

import type {
	HtmlParser,
	ParsedHtmlDocument
} from './html-parser.js';

/**
 * Cheerio-backed HTML syntax parser.
 *
 * Cheerio ownership stops at this boundary: downstream conversion receives the
 * parsed-document contract and continues to operate on domhandler elements.
 */
export class CheerioHtmlParser
	implements HtmlParser {

	/** Parses one source string using Cheerio's HTML document recovery behavior. */
	parse(
		html: string
	): ParsedHtmlDocument {
		return new CheerioParsedHtmlDocument(
			load(
				html
			)
		);
	}
}

/**
 * Keeps the Cheerio query handle private while exposing only required tree access.
 */
class CheerioParsedHtmlDocument
	implements ParsedHtmlDocument {

	constructor(
		private readonly $:
			CheerioAPI
	) {}

	selectFirst(
		selector: string
	): Element | undefined {
		return this.$(
			selector
		).first().get(
			0
		);
	}
}
