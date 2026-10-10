import { randomUUID } from 'node:crypto';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Manifest } from '#domain/manifest/manifest.js';
import type { GeneratedManifestWriter } from '#application/import/directory/generated-manifest-writer.js';

/** Writes a complete JSON Manifest atomically for reuse by `publish`. */
export class NodeGeneratedManifestWriter implements GeneratedManifestWriter {
	/**
	 * @param path Destination for the generated publication Manifest.
	 * @param manifest Validated Manifest containing all generated Resources.
	 */
	async write(path: string, manifest: Manifest): Promise<void> {
		await mkdir(dirname(path), { recursive: true });
		const temporaryPath = `${path}.${randomUUID()}.tmp`;
		try {
			await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
			await rename(temporaryPath, path);
		} finally {
			await unlink(temporaryPath).catch(error => {
				if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
			});
		}
	}
}
