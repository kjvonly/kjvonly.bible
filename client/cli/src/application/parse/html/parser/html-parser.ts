import type {
	Element
} from 'domhandler';

import type {
	ParseSourceLocation
} from '../../diagnostics/parse-diagnostics.js';

/** Parsed HTML tree capability consumed by semantic HTML conversion. */
export interface ParsedHtmlDocument {
	/**
	 * Returns the first element matching one CSS selector.
	 *
	 * @param selector CSS selector identifying an extraction boundary.
	 * @returns First matching element, or undefined when no match exists.
	 */
	selectFirst(
		selector: string
	): Element | undefined;

	/**
	 * Returns the source opening-tag position for one parsed element when known.
	 *
	 * Parser-inserted recovery elements may not have source coordinates and must
	 * therefore return undefined rather than inventing a position.
	 *
	 * @param element Parsed element whose authored source position is requested.
	 * @returns 1-based line/column position, or undefined when the parser has none.
	 */
	getSourceLocation(
		element: Element
	): ParseSourceLocation | undefined;
}

/**
 * Syntax-parser boundary for turning source HTML text into a queryable HTML tree.
 */
export interface HtmlParser {
	/**
	 * Parses one complete HTML source string without applying canonical semantics.
	 *
	 * @param html Complete source HTML text.
	 * @returns Queryable parsed tree consumed by semantic conversion.
	 */
	parse(
		html: string
	): ParsedHtmlDocument;
}
