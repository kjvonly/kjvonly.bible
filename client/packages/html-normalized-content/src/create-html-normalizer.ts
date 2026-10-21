import { CheerioHtmlParser } from './html/parser/cheerio-html-parser.js';
import {
	OrdinalNormalizedBlockIdGenerator
} from './identity/ordinal-normalized-block-id-generator.js';
import { CaptionBlockProcessor } from './html/processors/caption-block-processor.js';
import { FigureBlockProcessor } from './html/processors/figure-block-processor.js';
import { HeadingBlockProcessor } from './html/processors/heading-block-processor.js';
import { HtmlBlockProcessorRegistry } from './html/registry/html-block-processor-registry.js';
import { ListBlockProcessor } from './html/processors/list-block-processor.js';
import { ListItemBlockProcessor } from './html/processors/list-item-block-processor.js';
import { ParagraphBlockProcessor } from './html/processors/paragraph-block-processor.js';
import { PreformattedBlockProcessor } from './html/processors/preformatted-block-processor.js';
import { QuoteBlockProcessor } from './html/processors/quote-block-processor.js';
import { TableBlockProcessor } from './html/processors/table-block-processor.js';
import { TableCellBlockProcessor } from './html/processors/table-cell-block-processor.js';
import { TableRowBlockProcessor } from './html/processors/table-row-block-processor.js';
import { TableSectionBlockProcessor } from './html/processors/table-section-block-processor.js';
import { ThematicBreakBlockProcessor } from './html/processors/thematic-break-block-processor.js';
import { TransparentContainerBlockProcessor } from './html/processors/transparent-container-block-processor.js';
import { UnsupportedSemanticBlockProcessor } from './html/processors/unsupported-semantic-block-processor.js';
import { HtmlInlineParser } from './html/inline/html-inline-parser.js';
import { HtmlInlineProcessorRegistry } from './html/inline/html-inline-processor-registry.js';
import { AnchorInlineProcessor } from './html/inline/processors/anchor-inline-processor.js';
import { EmphasisInlineProcessor } from './html/inline/processors/emphasis-inline-processor.js';
import { LineBreakInlineProcessor } from './html/inline/processors/line-break-inline-processor.js';
import { MarkInlineProcessor } from './html/inline/processors/mark-inline-processor.js';
import { StrongInlineProcessor } from './html/inline/processors/strong-inline-processor.js';
import {
	HtmlNormalizedDocumentConverter
} from './html/converter/html-normalized-document-converter.js';
import { NormalizedDocumentValidator, type NormalizedDocument } from '@kjvonly/normalized-content';
import type { HtmlNormalizedDocumentConversionOptions } from './html/converter/html-normalized-document-converter.js';
import type { ParseResult } from './diagnostics/parse-diagnostics.js';

/**
 * Browser- and Node-compatible HTML normalization capability.
 *
 * Parsing and conversion have no filesystem, DOM, or application dependencies;
 * callers provide source HTML and decide what to do with the validated result.
 */
export interface HtmlNormalizer {
	readonly parser: CheerioHtmlParser;
	readonly converter: HtmlNormalizedDocumentConverter;

	/** Parses and validates one HTML string. */
	normalize(html: string, options?: HtmlNormalizedDocumentConversionOptions): NormalizedDocument;

	/** Returns import diagnostics alongside the accepted document. */
	normalizeWithDiagnostics(html: string, options?: HtmlNormalizedDocumentConversionOptions): ParseResult;
}

/**
 * Constructs the canonical HTML semantic converter used by the CLI and browser.
 * Each conversion receives a fresh block-ID generator to avoid cross-document state.
 *
 * @param validator Canonical schema validator shared with the caller's pipeline.
 * @returns Reusable syntax parser, converter and HTML-string convenience methods.
 */
export function createHtmlNormalizer(
	validator: NormalizedDocumentValidator = new NormalizedDocumentValidator()
): HtmlNormalizer {
	const parser = new CheerioHtmlParser();
	const htmlBlockProcessorRegistry =
		new HtmlBlockProcessorRegistry([
			new CaptionBlockProcessor(),
			new FigureBlockProcessor(),
			new HeadingBlockProcessor(),
			new ParagraphBlockProcessor(),
			new PreformattedBlockProcessor(),
			new TableBlockProcessor(),
			new TableCellBlockProcessor(),
			new TableRowBlockProcessor(),
			new TableSectionBlockProcessor(),
			new ThematicBreakBlockProcessor(),
			new QuoteBlockProcessor(),
			new ListBlockProcessor(),
			new ListItemBlockProcessor(),
			new TransparentContainerBlockProcessor(),
			new UnsupportedSemanticBlockProcessor()
		]);

	const htmlInlineProcessorRegistry =
		new HtmlInlineProcessorRegistry([
			new LineBreakInlineProcessor(),
			new AnchorInlineProcessor(),
			new EmphasisInlineProcessor(),
			new StrongInlineProcessor(),
			new MarkInlineProcessor(
				[
					'sup'
				],
				'superscript'
			),
			new MarkInlineProcessor(
				[
					'sub'
				],
				'subscript'
			),
			new MarkInlineProcessor(
				[
					'u'
				],
				'underline'
			),
			new MarkInlineProcessor(
				[
					'del',
					's',
					'strike'
				],
				'strikethrough'
			),
			new MarkInlineProcessor(
				[
					'small'
				],
				'small'
			),
			new MarkInlineProcessor(
				[
					'code'
				],
				'code'
			),
			new MarkInlineProcessor(
				[
					'mark'
				],
				'highlight'
			)
		]);

	const htmlInlineParser =
		new HtmlInlineParser(
			htmlInlineProcessorRegistry,
			tag =>
				htmlBlockProcessorRegistry.has(
					tag
				)
		);

	/**
	 * Creates document-scoped ID state so collision counters never leak between
	 * independent HTML conversions.
	 */
	const createNormalizedBlockIdGenerator =
		() =>
			new OrdinalNormalizedBlockIdGenerator();

	const htmlNormalizedDocumentConverter =
		new HtmlNormalizedDocumentConverter(
			validator,
			htmlBlockProcessorRegistry,
			htmlInlineParser,
			createNormalizedBlockIdGenerator
		);

	return {
		parser,
		converter: htmlNormalizedDocumentConverter,
		normalize: (html, options) =>
			htmlNormalizedDocumentConverter.convert(parser.parse(html), options),
		normalizeWithDiagnostics: (html, options) =>
			htmlNormalizedDocumentConverter.convertWithDiagnostics(parser.parse(html), options)
	};
}
