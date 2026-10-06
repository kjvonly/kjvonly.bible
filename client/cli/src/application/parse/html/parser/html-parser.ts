import type {
	Element
} from 'domhandler';

/** Parsed HTML tree capability consumed by semantic HTML conversion. */
export interface ParsedHtmlDocument {
	/** Returns the first element matching one CSS selector, if present. */
	selectFirst(
		selector: string
	): Element | undefined;
}

/**
 * Syntax-parser boundary for turning source HTML text into a queryable HTML tree.
 */
export interface HtmlParser {
	/** Parses one complete HTML source string without applying document semantics. */
	parse(
		html: string
	): ParsedHtmlDocument;
}
