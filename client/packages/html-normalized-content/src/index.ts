/** Browser-safe and Node-safe HTML-to-NormalizedDocument conversion. */
export { createHtmlNormalizer, type HtmlNormalizer } from './create-html-normalizer.js';
export type { HtmlNormalizedDocumentConversionOptions } from './html/converter/html-normalized-document-converter.js';
export type { HtmlParser, ParsedHtmlDocument } from './html/parser/html-parser.js';
export type { ParseDiagnostics, ParseResult, ParseSourceLocation, ParseWarning } from './diagnostics/parse-diagnostics.js';
export { OrdinalNormalizedBlockIdGenerator } from './identity/ordinal-normalized-block-id-generator.js';
