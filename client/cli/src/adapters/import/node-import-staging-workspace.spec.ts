import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, readlink, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateManifest } from '#domain/manifest/manifest.js';
import { NodeGeneratedManifestWriter } from './node-generated-manifest-writer.js';
import { NodeImportStagingWorkspace } from './node-import-staging-workspace.js';

const temporaryDirectories: string[] = [];
afterEach(async () => {
	for (const path of temporaryDirectories.splice(0)) await rm(path, { recursive: true, force: true });
});

describe('NodeImportStagingWorkspace', () => {
	it('copies previous staged events and keeps artifact symlinks instead of dereferencing', async () => {
		const root = await mkdtemp(join(tmpdir(), 'kjvonly-import-generation-'));
		temporaryDirectories.push(root);
		const baseline = join(root, '.staging');
		const output = join(root, 'generated.json');
		await mkdir(join(baseline, 'resource'), { recursive: true });
		await writeFile(join(baseline, 'resource', 'event.json'), 'previous signed event');
		await writeFile(join(root, 'original.nd.json'), '{"blocks":[]}');
		await symlink(join(root, 'original.nd.json'), join(baseline, 'resource', 'object'));

		const workspace = new NodeImportStagingWorkspace();
		const first = await workspace.prepare(baseline, output);
		expect(first.stagingRoot).not.toBe(baseline);
		expect(await readFile(join(first.stagingRoot, 'resource', 'event.json'), 'utf8')).toBe('previous signed event');
		expect(await readlink(join(first.stagingRoot, 'resource', 'object'))).toBe(join(root, 'original.nd.json'));
		await new NodeGeneratedManifestWriter().write(output, validateManifest({
			version: 1, kind: 37770, staging: { path: first.stagingRoot },
			nostr: { relays: ['wss://relay.example'] }
		}));
		const second = await workspace.prepare(baseline, output);
		expect(second.stagingRoot).not.toBe(first.stagingRoot);
		expect(await readFile(join(second.stagingRoot, 'resource', 'event.json'), 'utf8')).toBe('previous signed event');
		await writeFile(join(second.stagingRoot, 'resource', 'event.json'), 'changed');
		expect(await readFile(join(first.stagingRoot, 'resource', 'event.json'), 'utf8')).toBe('previous signed event');
		await second.discard();
		expect(await readFile(output, 'utf8')).toContain(first.stagingRoot);
	});

	it('rejects an existing publication Manifest pointing outside the configured staging family', async () => {
		const root = await mkdtemp(join(tmpdir(), 'kjvonly-import-generation-'));
		temporaryDirectories.push(root);
		const output = join(root, 'generated.json');
		const baseline = join(root, '.staging');
		await new NodeGeneratedManifestWriter().write(output, validateManifest({
			version: 1, kind: 37770, staging: { path: join(root, 'unrelated') },
			nostr: { relays: ['wss://relay.example'] }
		}));
		await expect(new NodeImportStagingWorkspace().prepare(baseline, output))
			.rejects.toThrow('unexpected staging root');
	});
});
