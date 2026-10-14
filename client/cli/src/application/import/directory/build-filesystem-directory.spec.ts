import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateManifest } from '#domain/manifest/manifest.js';
import { NodeImportDirectoryWalker } from '#adapters/import/node-import-directory-walker.js';
import { BuildFilesystemDirectory } from './build-filesystem-directory.js';

const directories: string[] = [];
afterEach(async () => {
	for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});

async function setup() {
	const workspace = await mkdtemp(join(tmpdir(), 'kjvonly-mixed-directory-'));
	directories.push(workspace);
	const source = join(workspace, 'source');
	await mkdir(join(source, 'books'), { recursive: true });
	const configuration = join(workspace, 'publication.yaml');
	const output = join(workspace, 'generated.json');
	const manifest = validateManifest({
		version: 1, kind: 37770, staging: { path: '.staging' },
		nostr: { relays: ['ws://localhost:3334'] },
		defaults: { strategy: 'local' },
		strategies: { local: { type: 'blossom', urls: ['http://localhost:3335'] } }
	});
	const build = vi.fn(async (_request: import('../manifest/filesystem-import-build-request.js').FilesystemImportBuildRequest) => manifest);
	const write = vi.fn(async () => {});
	const discard = vi.fn(async () => {});
	const prepare = vi.fn(async () => ({ stagingRoot: join(workspace, '.staging.import-new'), discard }));
	const workflow = new BuildFilesystemDirectory(new NodeImportDirectoryWalker(),
		{ load: async () => ({ path: configuration, directory: workspace, manifest }) },
		{ build }, { write }, { prepare });
	const request = { directory: source, manifestPath: configuration,
		outputManifestPath: output, filesystemRoot: 'app-filesystem', inlineLimitBytes: 0 };
	return { source, configuration, output, workflow, request, build, write, discard, prepare, manifest };
}

describe('BuildFilesystemDirectory', () => {
	it('walks mixed file types in one invocation, excludes hidden files and symlinks, preserves inline limit', async () => {
		const ctx = await setup();
		await writeFile(join(ctx.source, 'books', 'chapter.nd.json'), '{"blocks":[]}');
		await writeFile(join(ctx.source, 'book.pdf'), '%PDF');
		await writeFile(join(ctx.source, 'sermon.mp3'), 'mp3');
		await writeFile(join(ctx.source, '.secret.txt'), 'excluded');
		await symlink(join(ctx.source, 'book.pdf'), join(ctx.source, 'link.pdf'));
		await ctx.workflow.build(ctx.request);
		expect(ctx.build).toHaveBeenCalledOnce();
		const input = ctx.build.mock.calls[0]![0];
		expect(input.files.map(file => file.relativePath)).toEqual([
			'book.pdf', 'books/chapter.nd.json', 'sermon.mp3'
		]);
		expect(input.inlineLimitBytes).toBe(0);
		expect(input.manifest.staging.path).toContain('.staging.import-new');
		expect(ctx.write).toHaveBeenCalledWith(ctx.output, ctx.manifest);
	});

	it('preserves previous publication pointer if the mixed importer rejects a file', async () => {
		const ctx = await setup();
		await writeFile(join(ctx.source, 'books', 'bad.nd.json'), 'not json');
		ctx.build.mockRejectedValueOnce(new Error('Invalid Normalized Document'));
		await expect(ctx.workflow.build(ctx.request)).rejects.toThrow('Invalid Normalized Document');
		expect(ctx.discard).toHaveBeenCalledOnce();
		expect(ctx.write).not.toHaveBeenCalled();
	});

	it('rejects a generated Manifest within the walked directory before staging', async () => {
		const ctx = await setup();
		await writeFile(join(ctx.source, 'book.pdf'), '%PDF');
		const output = join(ctx.source, 'generated.json');
		await writeFile(output, '{"old":true}');
		await expect(ctx.workflow.build({ ...ctx.request, outputManifestPath: output }))
			.rejects.toThrow('Generated Manifest output must be outside the imported directory');
		expect(ctx.prepare).not.toHaveBeenCalled();
		expect(ctx.build).not.toHaveBeenCalled();
		expect(ctx.write).not.toHaveBeenCalled();
	});

	it('rejects an output path in a nested source directory even before it exists', async () => {
		const ctx = await setup();
		await writeFile(join(ctx.source, 'book.pdf'), '%PDF');
		await expect(ctx.workflow.build({
			...ctx.request, outputManifestPath: join(ctx.source, 'output', 'generated.json')
		})).rejects.toThrow('Generated Manifest output must be outside the imported directory');
		expect(ctx.prepare).not.toHaveBeenCalled();
	});

	it('rejects empty directories without staging', async () => {
		const ctx = await setup();
		await expect(ctx.workflow.build(ctx.request)).rejects.toThrow('No files found');
		expect(ctx.prepare).not.toHaveBeenCalled();
		expect(ctx.build).not.toHaveBeenCalled();
	});
});
