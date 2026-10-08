import type {
	ParseResult
} from './diagnostics/parse-diagnostics.js';

import type {
	HtmlNormalizedDocumentConversionOptions
} from './html/converter/html-normalized-document-converter.js';

import type {
	HtmlParser,
	ParsedHtmlDocument
} from './html/parser/html-parser.js';

/** Source-specific converter contract used by the generic parse application boundary. */
export interface HtmlDocumentConverter {
	/**
	 * Converts one parsed HTML tree into canonical content plus import diagnostics.
	 *
	 * @param document Parsed source tree produced by the HTML syntax boundary.
	 * @param options Extraction-boundary and provenance options for this conversion.
	 * @returns Validated normalized document and non-persisted conversion diagnostics.
	 */
	convertWithDiagnostics(
		document: ParsedHtmlDocument,
		options?: HtmlNormalizedDocumentConversionOptions
	): ParseResult;
}

/** Request for normalizing one in-memory HTML source document. */
export interface HtmlParseRequest {
	/** Discriminator used by ParseUseCase to select the HTML parsing pipeline. */
	readonly format: 'html';

	/** Complete source document text supplied to the HTML syntax parser. */
	readonly content: string;

	/** Optional selector limiting conversion to the first matching HTML root. */
	readonly rootSelector?: string;

	/** Optional logical provenance stored on the normalized document. */
	readonly source?: string;
}

/** Union of source-format requests accepted by the generic parse boundary. */
export type ParseRequest =
	HtmlParseRequest;

/** Source-neutral application boundary for document normalization. */
export interface Parse {
	/**
	 * Normalizes one source request using its registered format pipeline.
	 *
	 * @param request Source-format request containing the complete source document.
	 * @returns Canonical document and conversion diagnostics.
	 */
	run(
		request: ParseRequest
	): ParseResult;
}

/**
 * Application entry point for source-document normalization.
 *
 * The use case chooses the parser and converter for the requested source format
 * and returns the canonical NormalizedDocument plus import-only conversion
 * diagnostics. Source-specific syntax handling, traversal, identity, and
 * projection rules remain behind their respective boundaries.
 */
export class ParseUseCase
	implements Parse {

	constructor(
		private readonly htmlParser:
			HtmlParser,
		private readonly htmlDocumentConverter:
			HtmlDocumentConverter
	) {}

	/**
	 * Normalizes one source document without taking ownership of filesystem IO,
	 * batch traversal, Resource publication, or rendering.
	 *
	 * @param request Source-format request dispatched to its parser/converter pipeline.
	 * @returns Canonical document and import-only diagnostics.
	 */
	run(
		request: ParseRequest
	): ParseResult {
		switch (
			request.format
		) {
			case 'html': {
				const parsedDocument =
					this.htmlParser.parse(
						request.content
					);

				return this
					.htmlDocumentConverter
					.convertWithDiagnostics(
						parsedDocument,
						{
							rootSelector:
								request.rootSelector,
							source:
								request.source
						}
					);
			}
		}
	}
}
