import type { Manifest } from '#domain/manifest/manifest.js';
import type { ImportSourceFile } from '../classification/filesystem-import-classifier.js';

/** Shared build context for any directory/file compiler frontend. */
export interface FilesystemImportBuildRequest {
	/** Source root for generated Resource paths. */
	readonly directory: string;
	/** Canonical mount prepended to published filesystem paths. */
	readonly filesystemRoot: string;
	/** Validated publication configuration and selected staging generation. */
	readonly manifest: Manifest;
	/** Discovered root-relative files selected by the frontend. */
	readonly files: readonly ImportSourceFile[];
	/** Inline-size policy for Normalized Documents; generic files are external. */
	readonly inlineLimitBytes?: number;
}
