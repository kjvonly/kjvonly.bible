/** Physical format recognition is independent of semantic dataType validation. */
export interface FileFormatDefinition {
	/** Lowercase suffix, including its leading dot (for example `.nd.json`). */
	readonly extension: string;
	/** MIME type of the *uncompressed* content. */
	readonly mediaType: string;
}

/** Format metadata inferred from a source filename; no bytes are transformed. */
export interface ResolvedFileFormat {
	readonly baseMediaType: string;
	/** KJVOnly Resource media type describing the bytes as they currently exist. */
	readonly mediaType: string;
	/** Encodings already present in the source bytes, NOT instructions to encode. */
	readonly sourceEncoding: readonly ('gzip')[];
}

/**
 * Resolves the physical representation of files found by the directory walker.
 * Compound suffixes take precedence over short suffixes, independently of
 * registration order. A terminal `.gz` describes pre-existing gzip bytes;
 * it does not request that the artifact stager compress the file again.
 *
 * This is a filename-based hint, not a magic-byte integrity check or a
 * semantic validator. Explicit semantic files must still pass validation.
 */
export class FileFormatRegistry {
	private readonly definitions: readonly FileFormatDefinition[];

	constructor(definitions: readonly FileFormatDefinition[]) {
		const extensions = new Set<string>();
		for (const definition of definitions) {
			const extension = definition.extension.toLowerCase();
			if (
				!/^\.[a-z0-9]+(?:\.[a-z0-9]+)*$/.test(definition.extension) ||
				!/^[-\w.]+\/[-\w.+]+$/.test(definition.mediaType) ||
				extensions.has(extension)
			) {
				throw new Error(`Invalid or duplicate file format: ${definition.extension}`);
			}
			extensions.add(extension);
		}
		this.definitions = [...definitions].sort(
			(a, b) => b.extension.length - a.extension.length ||
				a.extension.localeCompare(b.extension)
		);
	}

	resolve(filename: string): ResolvedFileFormat {
		const lower = filename.toLowerCase();
		const gzipped = lower.endsWith('.gz');
		const underlyingName = gzipped ? lower.slice(0, -3) : lower;
		const definition = this.definitions.find(({ extension }) =>
			underlyingName.endsWith(extension)
		);
		const baseMediaType = definition?.mediaType ?? 'application/octet-stream';
		return {
			baseMediaType,
			mediaType: gzipped ? `${baseMediaType}+gzip` : baseMediaType,
			sourceEncoding: gzipped ? ['gzip'] : []
		};
	}
}

/**
 * Common file formats for descriptor metadata, not a publication allowlist.
 * ZIP-derived formats (DOCX/ODT/EPUB) and other archives are opaque files.
 * Only a terminal `.gz` is currently recognized as an encoding wrapper.
 * Unknown suffixes remain valid and resolve to application/octet-stream.
 */
export const DEFAULT_FILE_FORMATS: readonly FileFormatDefinition[] = [
	// Semantic documents and ordinary text
	{ extension: '.nd.json', mediaType: 'application/json' },
	{ extension: '.json', mediaType: 'application/json' },
	{ extension: '.jsonl', mediaType: 'application/x-ndjson' },
	{ extension: '.txt', mediaType: 'text/plain' },
	{ extension: '.md', mediaType: 'text/markdown' },
	{ extension: '.html', mediaType: 'text/html' },
	{ extension: '.htm', mediaType: 'text/html' },
	{ extension: '.csv', mediaType: 'text/csv' },
	{ extension: '.xml', mediaType: 'application/xml' },
	{ extension: '.yaml', mediaType: 'application/yaml' },
	{ extension: '.yml', mediaType: 'application/yaml' },
	{ extension: '.pdf', mediaType: 'application/pdf' },
	{ extension: '.rtf', mediaType: 'application/rtf' },
	// Office and OpenDocument files are already packaged; do not unzip them.
	{ extension: '.doc', mediaType: 'application/msword' },
	{ extension: '.docx', mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
	{ extension: '.odt', mediaType: 'application/vnd.oasis.opendocument.text' },
	{ extension: '.xls', mediaType: 'application/vnd.ms-excel' },
	{ extension: '.xlsx', mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
	{ extension: '.ods', mediaType: 'application/vnd.oasis.opendocument.spreadsheet' },
	{ extension: '.ppt', mediaType: 'application/vnd.ms-powerpoint' },
	{ extension: '.pptx', mediaType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
	{ extension: '.odp', mediaType: 'application/vnd.oasis.opendocument.presentation' },
	{ extension: '.odg', mediaType: 'application/vnd.oasis.opendocument.graphics' },
	{ extension: '.epub', mediaType: 'application/epub+zip' },
	// Audio/video
	{ extension: '.mp3', mediaType: 'audio/mpeg' },
	{ extension: '.m4a', mediaType: 'audio/mp4' },
	{ extension: '.wav', mediaType: 'audio/wav' },
	{ extension: '.ogg', mediaType: 'audio/ogg' },
	{ extension: '.opus', mediaType: 'audio/opus' },
	{ extension: '.flac', mediaType: 'audio/flac' },
	{ extension: '.aac', mediaType: 'audio/aac' },
	{ extension: '.mp4', mediaType: 'video/mp4' },
	{ extension: '.webm', mediaType: 'video/webm' },
	{ extension: '.mov', mediaType: 'video/quicktime' },
	{ extension: '.mkv', mediaType: 'video/x-matroska' },
	// Images
	{ extension: '.jpg', mediaType: 'image/jpeg' },
	{ extension: '.jpeg', mediaType: 'image/jpeg' },
	{ extension: '.png', mediaType: 'image/png' },
	{ extension: '.gif', mediaType: 'image/gif' },
	{ extension: '.webp', mediaType: 'image/webp' },
	{ extension: '.svg', mediaType: 'image/svg+xml' },
	{ extension: '.avif', mediaType: 'image/avif' },
	{ extension: '.bmp', mediaType: 'image/bmp' },
	{ extension: '.tif', mediaType: 'image/tiff' },
	{ extension: '.tiff', mediaType: 'image/tiff' },
	// Archives and standalone compressed formats. Preserve their original bytes.
	{ extension: '.zip', mediaType: 'application/zip' },
	{ extension: '.7z', mediaType: 'application/x-7z-compressed' },
	{ extension: '.rar', mediaType: 'application/vnd.rar' },
	{ extension: '.tar', mediaType: 'application/x-tar' },
	{ extension: '.tgz', mediaType: 'application/gzip' },
	{ extension: '.xz', mediaType: 'application/x-xz' },
	{ extension: '.bz2', mediaType: 'application/x-bzip2' },
	{ extension: '.zst', mediaType: 'application/zstd' },
	{ extension: '.zstd', mediaType: 'application/zstd' }
];

export function createDefaultFileFormatRegistry(): FileFormatRegistry {
	return new FileFormatRegistry(DEFAULT_FILE_FORMATS);
}
