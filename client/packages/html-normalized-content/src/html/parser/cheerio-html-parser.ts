import {
	load
} from 'cheerio';

import {
	isTag
} from 'domhandler';

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

import type {
	ParseSourceLocation
} from '../../diagnostics/parse-diagnostics.js';

/**
 * Cheerio-backed HTML syntax parser.
 *
 * Cheerio ownership stops at this boundary: downstream conversion receives the
 * parsed-document contract and continues to operate on domhandler elements.
 */
export class CheerioHtmlParser
	implements HtmlParser {

	/**
	 * Parses one source string using Cheerio's HTML document recovery behavior.
	 *
	 * @param html Complete source HTML text.
	 * @returns Parsed-document capability that keeps Cheerio behind this adapter.
	 */
	parse(
		html: string
	): ParsedHtmlDocument {
		return new CheerioParsedHtmlDocument(
			load(
				html,
				{
					sourceCodeLocationInfo:
						true
				}
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

	/**
	 * Resolves the first matching element without exposing Cheerio collection APIs.
	 *
	 * @param selector CSS selector supplied by the converter.
	 * @returns First matching domhandler element, or undefined when absent.
	 */
	selectFirst(
		selector: string
	): Element | undefined {
		const node =
			this.$(
				selector
			).first().get(
				0
			);

		return node !==
			undefined &&
			isTag(
				node
			)
			? node
			: undefined;
	}

	/**
	 * Reads parse5-authored source coordinates without exposing parser-specific
	 * location metadata through the ParsedHtmlDocument contract.
	 *
	 * @param element Parsed element whose opening-tag position is requested.
	 * @returns 1-based line/column coordinates, or undefined for implicit nodes.
	 */
	getSourceLocation(
		element: Element
	): ParseSourceLocation | undefined {
		const location =
			element.sourceCodeLocation;

		if (!location) {
			return undefined;
		}

		const start =
			location.startTag ??
				location;

		if (
			!Number.isInteger(
				start.startLine
			) ||
			!Number.isInteger(
				start.startCol
			) ||
			start.startLine < 1 ||
			start.startCol < 1
		) {
			return undefined;
		}

		return {
			line:
				start.startLine,
			column:
				start.startCol
		};
	}
}
