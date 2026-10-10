import { lstat, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { ImportSourceFile } from '#application/import/classification/filesystem-import-classifier.js';
import type { ImportDirectoryWalker } from '#application/import/directory/import-directory-walker.js';

/**
 * Recursively inventories ordinary files beneath one local directory.
 *
 * No file content is loaded here. Symbolic links, hidden paths, and special
 * filesystem nodes are excluded, so discovery never traverses a link outside
 * the chosen source root. Content recognition belongs to the import workflow.
 */
export class NodeImportDirectoryWalker implements ImportDirectoryWalker {
	/**
	 * @param directory Source root; must be an ordinary directory (not a symlink).
	 * @returns Root-relative forward-slash paths in stable lexical order.
	 */
	async walk(directory: string): Promise<readonly ImportSourceFile[]> {
		const root = resolve(directory);
		const metadata = await lstat(root);
		if (!metadata.isDirectory()) {
			throw new Error(`Import source is not a directory: ${root}`);
		}

		const files: ImportSourceFile[] = [];
		await this.collect(root, '', files);
		return files.sort((a, b) => a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0);
	}

	/**
	 * @param root Absolute source directory, kept fixed throughout traversal.
	 * @param directoryPath Root-relative directory using `/` separators.
	 * @param files Accumulator for supported regular-file metadata.
	 */
	private async collect(
		root: string,
		directoryPath: string,
		files: ImportSourceFile[]
	): Promise<void> {
		const directory = directoryPath ? join(root, ...directoryPath.split('/')) : root;
		const entries = await readdir(directory, { withFileTypes: true });
		entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

		for (const entry of entries) {
			// Do not expose hidden staging/configuration as application Resources.
			if (entry.name.startsWith('.')) continue;
			const relativePath = directoryPath ? `${directoryPath}/${entry.name}` : entry.name;
			const sourcePath = join(directory, entry.name);
			// lstat, rather than stat, prevents descending through symlinks.
			const metadata = await lstat(sourcePath);
			if (metadata.isDirectory()) {
				await this.collect(root, relativePath, files);
			} else if (metadata.isFile()) {
				files.push({ sourcePath, relativePath, size: metadata.size });
			}
		}
	}
}
