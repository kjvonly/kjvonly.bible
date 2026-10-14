import { createReadStream } from 'node:fs';
import { open, readFile } from 'node:fs/promises';
import { createGunzip, gunzipSync } from 'node:zlib';
import type { ImportContentReader } from '#application/import/resolution/filesystem-semantic-import-resolver.js';
import type { ResolvedFileFormat } from '#application/import/format/file-format-registry.js';

const MAX_PROBE_BYTES = 64 * 1024;

/**
 * Content reader for semantic validation, independent of the publishing format.
 * A pre-encoded source is decoded only for recognition/validation; the Manifest
 * still references the original bytes, which may be uploaded unchanged.
 */
export class NodeImportContentReader implements ImportContentReader {
	private readonly gzipped: boolean;

	constructor(
		private readonly path: string,
		sourceEncoding: ResolvedFileFormat['sourceEncoding'] = []
	) {
		if (sourceEncoding.length > 1 ||
			(sourceEncoding.length === 1 && sourceEncoding[0] !== 'gzip')) {
			throw new Error(`Unsupported source encoding for "${path}".`);
		}
		this.gzipped = sourceEncoding.length === 1;
	}

	/** Reads up to 64 KiB of decoded bytes without expanding the entire source. */
	async readPrefix(maxBytes: number): Promise<Uint8Array> {
		if (!Number.isSafeInteger(maxBytes) || maxBytes < 0 || maxBytes > MAX_PROBE_BYTES) {
			throw new Error(`Invalid import prefix size: ${maxBytes}`);
		}
		if (maxBytes === 0) return new Uint8Array();
		if (this.gzipped) return this.readGzipPrefix(maxBytes);

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

	/** Bounded decompressed prefix; large gzip sources are not fully buffered for probes. */
	private async readGzipPrefix(maxBytes: number): Promise<Uint8Array> {
		const input = createReadStream(this.path);
		const output = input.pipe(createGunzip());
		const chunks: Buffer[] = [];
		let remaining = maxBytes;
		try {
			for await (const chunk of output) {
				const bytes = chunk as Buffer;
				const length = Math.min(remaining, bytes.length);
				chunks.push(bytes.subarray(0, length));
				remaining -= length;
				if (remaining === 0) break;
			}
			return Buffer.concat(chunks, maxBytes - remaining);
		} finally {
			output.destroy();
			input.destroy();
		}
	}

	/** Reads and decodes the entire semantic candidate for validation. */
	async readAll(): Promise<Uint8Array> {
		const bytes = await readFile(this.path);
		return this.gzipped ? gunzipSync(bytes) : bytes;
	}
}
