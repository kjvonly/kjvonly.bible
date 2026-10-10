import type { Manifest } from '#domain/manifest/manifest.js';

/**
 * Persists a generated Manifest pointer after successful staging. The Node
 * implementation writes a sibling temporary file and renames it atomically;
 * writing this file does not itself publish Nostr events or Blossom artifacts.
 */
export interface GeneratedManifestWriter {
	/**
	 * @param path Explicit output path (not the original source YAML).
	 * @param manifest Fully validated Manifest passed to the shared build executor.
	 */
	write(path: string, manifest: Manifest): Promise<void>;
}
