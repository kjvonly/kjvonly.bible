import type {
	FilesystemImportRecognizer,
	ImportFileProbe,
	ImportSourceFile
} from '../filesystem-import-classifier.js';

const NORMALIZED_DOCUMENT_TYPE = 'kjvonly.normalized-document';
const MAX_JSON_PROBE_BYTES = 64 * 1024;
// Deliberately permissive: a `blocks` array is evidence, not validation.
const BLOCKS_ARRAY_HINT = /"blocks"\s*:\s*\[/;

/**
 * Recognizes plausible Normalized Documents without materializing or parsing
 * the full JSON payload. SemanticTypeRegistry validates complete content later.
 *
 * A `.nd.json` suffix is an explicit hint and needs no read. For ordinary
 * `.json` files, a bounded prefix is scanned for a `"blocks": [` property.
 * This scan may match nested objects or JSON string contents, and may miss a
 * property beyond the prefix: both are expected limits of cheap recognition.
 * It must never be treated as proof of a valid Normalized Document.
 */
export class NormalizedDocumentRecognizer implements FilesystemImportRecognizer {
	readonly name = 'normalized-document';

	/**
	 * @param file Discovery metadata; size bounds prefix reads, path gives extension.
	 * @param probe Adapter-owned reader that returns no more than the requested prefix.
	 * @returns A possible Normalized Document family, or undefined without evidence.
	 */
	async recognize(
		file: ImportSourceFile,
		probe: ImportFileProbe
	): Promise<string | undefined> {
		const path = file.relativePath.toLowerCase();
		if (path.endsWith('.nd.json')) return NORMALIZED_DOCUMENT_TYPE;
		if (!path.endsWith('.json') || file.size <= 0) return undefined;

		const bytes = await probe.readPrefix(Math.min(file.size, MAX_JSON_PROBE_BYTES));
		// The final bytes may cut through UTF-8; clues here are ASCII JSON keys.
		const sample = new TextDecoder().decode(bytes);
		return BLOCKS_ARRAY_HINT.test(sample) ? NORMALIZED_DOCUMENT_TYPE : undefined;
	}
}
