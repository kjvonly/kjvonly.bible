import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { LocalNostrSigner } from '../nostr/signer/local-nostr-signer.js';
import { NodeCollectionEventStagingRepository } from './node-collection-event-staging-repository.js';

const directories: string[] = [];

async function createDirectory(): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), 'kjvonly-collection-staging-'));
	directories.push(directory);
	return directory;
}

afterEach(async () => {
	for (const directory of directories.splice(0)) {
		await rm(directory, { recursive: true, force: true });
	}
});

describe('NodeCollectionEventStagingRepository', () => {
	it('atomically stages a maximum-length Collection name', async () => {
		const stagingRoot = await createDirectory();
		const event = await new LocalNostrSigner('01'.repeat(32)).sign({
			kind: 37770,
			created_at: 1_791_837_567,
			tags: [],
			content: '{}'
		});
		const repository = new NodeCollectionEventStagingRepository();

		const staged = await repository.stage({
			stagingRoot,
			collectionName: 'a'.repeat(128),
			inputRevision: 'b'.repeat(32),
			event
		});

		expect(await repository.list(stagingRoot)).toEqual([staged]);
		expect(await repository.read(staged)).toEqual(event);
	});
});
