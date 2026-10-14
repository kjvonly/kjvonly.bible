import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { NodeArtifactStagingRepository } from './node-artifact-staging-repository.js';

const directories: string[] = [];

async function createDirectory(): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), 'kjvonly-artifact-staging-'));
	directories.push(directory);
	return directory;
}

afterEach(async () => {
	for (const directory of directories.splice(0)) {
		await rm(directory, { recursive: true, force: true });
	}
});

describe('NodeArtifactStagingRepository', () => {
	it('stages materialized bytes with a long valid key', async () => {
		const stagingRoot = await createDirectory();
		const repository = new NodeArtifactStagingRepository();
		const bytes = Buffer.from('normalized document');

		const entry = await repository.stageMaterialized({
			stagingRoot,
			resourceName: 'documents',
			key: 'a'.repeat(128),
			bytes,
			sourceMtimeMs: 1_791_836_517_684,
			sourceSize: 1_279_230,
			artifactRevision: '65d5a103',
			extension: '.json'
		});

		expect(Buffer.byteLength(basename(entry.path), 'utf8')).toBeLessThanOrEqual(255);
		expect(await repository.list(stagingRoot, 'documents')).toEqual([entry]);
		expect(await readFile(entry.path)).toEqual(bytes);
		expect(await readdir(join(stagingRoot, 'artifacts', 'documents'))).toEqual([
			basename(entry.path)
		]);
	});

	it('stages and re-reads a 255-byte source basename without ENAMETOOLONG', async () => {
		const stagingRoot = await createDirectory();
		const repository = new NodeArtifactStagingRepository();
		const key = 'a'.repeat(251);
		const bytes = Buffer.from('original pdf bytes');
		const request = {
			stagingRoot, resourceName: 'documents', key, bytes,
			sourceMtimeMs: 1_791_836_517_684,
			sourceSize: bytes.length, artifactRevision: '65d5a103',
			extension: '.pdf'
		};
		const entry = await repository.stageMaterialized(request);
		expect(Buffer.byteLength(key + '.pdf', 'utf8')).toBe(255);
		expect(entry.path).toContain('/by-filename/');
		expect(await readFile(entry.path)).toEqual(bytes);
		expect(await repository.list(stagingRoot, 'documents')).toEqual([entry]);
		const updated = await repository.stageMaterialized({
			...request, bytes: Buffer.from('new pdf bytes'),
			previous: entry
		});
		expect(await repository.list(stagingRoot, 'documents')).toEqual([updated]);
		expect(await readFile(updated.path, 'utf8')).toBe('new pdf bytes');
	});

	it('preserves old flat and new sharded artifact staging side-by-side', async () => {
		const stagingRoot = await createDirectory();
		const repository = new NodeArtifactStagingRepository();
		const common = {
			stagingRoot, resourceName: 'documents', sourceMtimeMs: 100,
			sourceSize: 3, artifactRevision: '65d5a103', extension: '.txt'
		};
		const legacy = await repository.stageMaterialized({ ...common, key: 'short', bytes: Buffer.from('old') });
		const long = await repository.stageMaterialized({ ...common, key: '界'.repeat(70), bytes: Buffer.from('new') });
		const extensionless = await repository.stageMaterialized({
			...common, key: 'x'.repeat(240), extension: '', bytes: Buffer.from('raw')
		});
		expect((await repository.list(stagingRoot, 'documents')).map(a => a.metadata.key).sort())
			.toEqual([legacy.metadata.key, long.metadata.key, extensionless.metadata.key].sort());
	});

	it('supports long identity symlinks without changing the source bytes', async () => {
		const stagingRoot = await createDirectory();
		const sourcePath = join(stagingRoot, 'source.mp3');
		await writeFile(sourcePath, 'mp3');
		const repository = new NodeArtifactStagingRepository();
		const entry = await repository.stageIdentity({
			stagingRoot, resourceName: 'audio', key: 's'.repeat(251),
			sourcePath, sourceMtimeMs: 100, sourceSize: 3,
			artifactRevision: '65d5a103', extension: '.mp3'
		});
		expect(entry.kind).toBe('symlink');
		expect(await readFile(entry.path, 'utf8')).toBe('mp3');
		expect(await repository.list(stagingRoot, 'audio')).toEqual([entry]);
	});

	it('stages an identity symlink with a long valid key', async () => {
		const stagingRoot = await createDirectory();
		const sourcePath = join(stagingRoot, 'source.nd.json');
		await writeFile(sourcePath, 'normalized document');
		const repository = new NodeArtifactStagingRepository();

		const entry = await repository.stageIdentity({
			stagingRoot,
			resourceName: 'documents',
			key: 'a'.repeat(128),
			sourcePath,
			sourceMtimeMs: 1_791_836_517_684,
			sourceSize: 19,
			artifactRevision: '65d5a103',
			extension: '.json'
		});

		expect(entry.kind).toBe('symlink');
		expect(await repository.list(stagingRoot, 'documents')).toEqual([entry]);
		expect(await readFile(entry.path, 'utf8')).toBe('normalized document');
	});
});
