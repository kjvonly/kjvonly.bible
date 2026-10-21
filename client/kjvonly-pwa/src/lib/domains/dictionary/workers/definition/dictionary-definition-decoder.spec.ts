import { describe, expect, it } from 'vitest';
import { gzipDictionaryChunk } from '../../resources/entries/dictionary-chunk-compressor';
import { decompressDictionaryChunk } from './dictionary-definition-decoder';

describe('Dictionary chunk decompression', () => {
	it('round-trips actual gzip bytes in a worker-compatible runtime', async () => {
		const json = JSON.stringify({ abandon: [{ word: 'ABANDON', content: '<p>Leave</p>' }] });
		const gzip = await gzipDictionaryChunk(json);
		expect(await decompressDictionaryChunk(gzip)).toBe(json);
	});

	it('rejects invalid gzip instead of returning corrupted definitions', async () => {
		await expect(decompressDictionaryChunk(new Uint8Array([1, 2, 3]))).rejects.toThrow();
	});
});
