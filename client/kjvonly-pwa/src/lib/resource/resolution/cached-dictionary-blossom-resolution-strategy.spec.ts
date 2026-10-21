import { describe, expect, it, vi } from 'vitest';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import type { ResourceDescriptor } from '$lib/resource/descriptors/resource-descriptor';
import { CachedDictionaryBlossomResolutionStrategy } from './cached-dictionary-blossom-resolution-strategy';

/** Supplies only the descriptor fields used by the cache adapter. */
function descriptor(bytes: Uint8Array, resourceType = 'dictionary/entries'): ResourceDescriptor {
	return {
		metadata: { resourceType },
		strategy: { type: 'blossom', data: { sha256: bytesToHex(sha256(bytes)) } }
	} as ResourceDescriptor;
}

describe('Dictionary compressed-bundle cache', () => {
	it('uses verified cached content when present', async () => {
		const bytes = new Uint8Array([1, 2, 3]);
		const remote = { resolve: vi.fn().mockResolvedValue(bytes) };
		const saved = new Map<string, Response>();
		const original = globalThis.caches;
		Object.defineProperty(globalThis, 'caches', { configurable: true, value: {
			open: async () => ({
				match: async (key: string) => saved.get(key)?.clone(),
				put: async (key: string, response: Response) => { saved.set(key, response); }
			})
		} });
		try {
			const resolver = new CachedDictionaryBlossomResolutionStrategy(remote);
			await expect(resolver.resolve(descriptor(bytes))).resolves.toEqual(bytes);
			await expect(resolver.resolve(descriptor(bytes))).resolves.toEqual(bytes);
			expect(remote.resolve).toHaveBeenCalledTimes(1);
		} finally {
			Object.defineProperty(globalThis, 'caches', { configurable: true, value: original });
		}
	});

	it('rejects corrupt cached bytes and fetches a verified replacement', async () => {
		const bytes = new Uint8Array([1, 2, 3]);
		const remote = { resolve: vi.fn().mockResolvedValue(bytes) };
		const saved = new Map<string, Response>();
		const original = globalThis.caches;
		Object.defineProperty(globalThis, 'caches', { configurable: true, value: {
			open: async () => ({
				match: async (key: string) => saved.get(key)?.clone() ?? new Response(new Uint8Array([99])),
				put: async (key: string, response: Response) => { saved.set(key, response); }
			})
		} });
		try {
			const resolver = new CachedDictionaryBlossomResolutionStrategy(remote);
			await expect(resolver.resolve(descriptor(bytes))).resolves.toEqual(bytes);
			expect(remote.resolve).toHaveBeenCalledOnce();
			expect(saved.size).toBe(1);
		} finally {
			Object.defineProperty(globalThis, 'caches', { configurable: true, value: original });
		}
	});

	it('bypasses the dictionary-only cache for other Resource types', async () => {
		const bytes = new Uint8Array([4, 5]);
		const remote = { resolve: vi.fn().mockResolvedValue(bytes) };
		const resolver = new CachedDictionaryBlossomResolutionStrategy(remote);
		await expect(resolver.resolve(descriptor(bytes, 'bible/chapters'))).resolves.toEqual(bytes);
		expect(remote.resolve).toHaveBeenCalledTimes(1);
	});
});
