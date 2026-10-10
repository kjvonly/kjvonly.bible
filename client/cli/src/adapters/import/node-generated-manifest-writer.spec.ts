import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateManifest } from '#domain/manifest/manifest.js';
import { NodeGeneratedManifestWriter } from './node-generated-manifest-writer.js';

const temporaryDirectories: string[] = [];
afterEach(async () => {
	for (const directory of temporaryDirectories.splice(0)) {
		await rm(directory, { recursive: true, force: true });
	}
});

describe('NodeGeneratedManifestWriter', () => {
	it('writes the complete generated Manifest as JSON and can replace it on rebuild', async () => {
		const root = await mkdtemp(join(tmpdir(), 'kjvonly-import-manifest-'));
		temporaryDirectories.push(root);
		const output = join(root, 'generated', 'publication.json');
		const manifest = validateManifest({
			version: 1, kind: 37770, staging: { path: join(root, '.staging') },
			nostr: { relays: ['wss://relay.example'] }
		});
		const writer = new NodeGeneratedManifestWriter();
		await writer.write(output, manifest);
		expect(JSON.parse(await readFile(output, 'utf8'))).toEqual(manifest);
		const changed = { ...manifest, kind: 30023 };
		await writer.write(output, changed);
		expect(JSON.parse(await readFile(output, 'utf8'))).toEqual(changed);
	});
});
