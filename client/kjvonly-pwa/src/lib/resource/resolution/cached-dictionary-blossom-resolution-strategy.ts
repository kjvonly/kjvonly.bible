import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { DICTIONARY_RESOURCE_TYPE } from '$lib/domains/dictionary';
import type { ResourceDescriptor } from '$lib/resource/descriptors/resource-descriptor';
import type { ResourceResolutionStrategy } from './resource-resolution-strategy';

const CACHE_NAME = 'kjvonly-dictionary-bundles-v1';

/**
 * Best-effort local cache of already integrity-verified compressed dictionary bytes.
 *
 * Only Dictionary Blossom Resources are cached. The underlying strategy still
 * validates freshly downloaded size and SHA-256. Cache hits are rehashed before
 * use, and unavailable/full Cache Storage must not prevent installation.
 * A retry after an interrupted import can reuse the verified compressed bundle.
 */
export class CachedDictionaryBlossomResolutionStrategy implements ResourceResolutionStrategy {
	readonly type = 'blossom';

	constructor(private readonly remote: Pick<ResourceResolutionStrategy, 'resolve'>) {}

	/** Resolves verified bytes, preferentially from Cache Storage for dictionaries. */
	async resolve(descriptor: ResourceDescriptor): Promise<Uint8Array> {
		const metadata = this.dictionaryBlobMetadata(descriptor);
		if (!metadata || typeof caches === 'undefined') return this.remote.resolve(descriptor);

		const key = `https://kjvonly.invalid/dictionary/blobs/${metadata.digest}`;
		const cached = await this.readVerifiedCache(key, metadata.digest, metadata.size);
		if (cached) return cached;

		const bytes = await this.remote.resolve(descriptor);
		await this.cacheVerifiedBytes(key, bytes);
		return bytes;
	}

	/** Finds a cache key only for a valid Dictionary Blossom descriptor digest. */
	private dictionaryBlobMetadata(descriptor: ResourceDescriptor): { digest: string; size?: number } | undefined {
		if (descriptor.metadata.resourceType !== DICTIONARY_RESOURCE_TYPE || descriptor.strategy.type !== 'blossom') return;
		const data = descriptor.strategy.data;
		if (typeof data !== 'object' || data === null || !('sha256' in data)) return;
		const digest = data.sha256;
		if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest)) return;
		const size = 'size' in data ? data.size : undefined;
		if (size !== undefined && (typeof size !== 'number' || !Number.isSafeInteger(size) || size < 0)) return;
		return size === undefined ? { digest } : { digest, size: size as number };
	}

	/** Cache data is not a trust boundary: verify SHA-256 before reuse. */
	private async readVerifiedCache(key: string, expectedDigest: string, expectedSize?: number): Promise<Uint8Array | undefined> {
		try {
			const cache = await caches.open(CACHE_NAME);
			const response = await cache.match(key);
			if (!response) return;
			const bytes = new Uint8Array(await response.arrayBuffer());
			if (expectedSize !== undefined && bytes.byteLength !== expectedSize) return;
			return bytesToHex(sha256(bytes)) === expectedDigest ? bytes : undefined;
		} catch {
			return;
		}
	}

	/** Cache failures are nonfatal; the generic verified Resource path still works. */
	private async cacheVerifiedBytes(key: string, bytes: Uint8Array): Promise<void> {
		try {
			const cache = await caches.open(CACHE_NAME);
			await cache.put(key, new Response(new Blob([new Uint8Array(bytes)])));
		} catch {
			// Storage quota or unsupported Cache Storage must never fail an install.
		}
	}
}
