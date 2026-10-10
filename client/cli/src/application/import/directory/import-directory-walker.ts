import type { ImportSourceFile } from '../classification/filesystem-import-classifier.js';

/** Discovers regular source files without interpreting their semantic contents. */
export interface ImportDirectoryWalker {
	/**
	 * @param directory Local source-tree root; each returned path is relative to it.
	 * @returns Deterministically ordered file metadata; never follows symbolic links.
	 */
	walk(directory: string): Promise<readonly ImportSourceFile[]>;
}
