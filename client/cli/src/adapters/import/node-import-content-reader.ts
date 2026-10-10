import { open, readFile } from 'node:fs/promises';
import type { ImportContentReader } from '#application/import/resolution/filesystem-semantic-import-resolver.js';

const MAX_PROBE_BYTES = 64 * 1024;

/**
 * Node filesystem adapter for semantic import. Prefix probes never load the
 * full file. Complete bytes are only requested after recognition yields a
 * semantic candidate; processing large binary files remains a separate path.
 */
export class NodeImportContentReader implements ImportContentReader {
	constructor(private readonly path: string) {}

	/**
	 * Reads at most `maxBytes` from the beginning of the file, including files
	 * larger than the configured recognition cap. Handles partial file reads.
	 *
	 * @param maxBytes Bounded count (0..64 KiB) requested by a recognizer.
	 */
	async readPrefix(maxBytes: number): Promise<Uint8Array> {
		if (!Number.isSafeInteger(maxBytes) || maxBytes < 0 || maxBytes > MAX_PROBE_BYTES) {
			throw new Error(`Invalid import prefix size: ${maxBytes}`);
		}
		if (maxBytes === 0) return new Uint8Array();

		const handle = await open(this.path, 'r');
		try {
			const buffer = Buffer.allocUnsafe(maxBytes);
			let offset = 0;
			while (offset < maxBytes) {
				const { bytesRead } = await handle.read(buffer, offset, maxBytes - offset, offset);
				if (bytesRead === 0) break;
				offset += bytesRead;
			}
			return buffer.subarray(0, offset);
		} finally {
			await handle.close();
		}
	}

	/** Reads the whole candidate for one parse and multi-version validation. */
	readAll(): Promise<Uint8Array> {
		return readFile(this.path);
	}
}
