import { describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';
import { validateManifest } from '#domain/manifest/manifest.js';
import type { ImportSourceFile } from '../classification/filesystem-import-classifier.js';
import { BuildNormalizedDocumentDirectory } from './build-normalized-document-directory.js';

const manifest = validateManifest({
	version: 1, kind: 37770, staging: { path: '.staging' },
	nostr: { relays: ['wss://relay.example'] }
});
const directory = resolve('content');
function file(relativePath: string): ImportSourceFile {
	return { sourcePath: resolve(directory, relativePath), relativePath, size: 12 };
}

function setup(files: readonly ImportSourceFile[]) {
	const walk = vi.fn(async () => files);
	const load = vi.fn(async () => ({ path: '/config/manifest.yaml', directory: '/config', manifest }));
	const build = vi.fn(async () => manifest);
	const write = vi.fn(async () => {});
	const discard = vi.fn(async () => {});
	const prepare = vi.fn(async () => ({ stagingRoot: '/config/.staging.import-test', discard }));
	const useCase = new BuildNormalizedDocumentDirectory({ walk }, { load }, { build }, { write }, { prepare });
	return { useCase, walk, load, build, write, prepare, discard };
}

describe('BuildNormalizedDocumentDirectory', () => {
	it('selects only .nd.json across the whole inventory and builds one combined manifest', async () => {
		const files = [file('index.html'), file('books/a.nd.json'), file('other.json'), file('sermons/z.ND.JSON')];
		const { useCase, walk, load, build, write, prepare } = setup(files);
		const compiled = await useCase.build({ directory: './content', manifestPath: './config.yaml', outputManifestPath: './compiled.json', filesystemRoot: 'library' });
		expect(compiled).toBe(manifest);
		expect(walk).toHaveBeenCalledWith(directory);
		expect(load).toHaveBeenCalledWith('./config.yaml');
		expect(build).toHaveBeenCalledOnce();
		expect(build).toHaveBeenCalledWith({
			directory, manifest: { ...manifest, staging: { path: '/config/.staging.import-test' } }, filesystemRoot: 'library',
			files: [files[1], files[3]], inlineLimitBytes: undefined
		});
		expect(write).toHaveBeenCalledWith(resolve('./compiled.json'), manifest);
		expect(prepare).toHaveBeenCalledWith('/config/.staging', resolve('./compiled.json'));
	});

	it('does not stage or load a manifest if no documents were discovered', async () => {
		const { useCase, load, build, write } = setup([file('page.html'), file('ordinary.json')]);
		await expect(useCase.build({ directory: './content', manifestPath: 'config.yaml', outputManifestPath: './compiled.json', filesystemRoot: 'library' }))
			.rejects.toThrow('No .nd.json files found');
		expect(load).not.toHaveBeenCalled();
		expect(build).not.toHaveBeenCalled();
		expect(write).not.toHaveBeenCalled();
	});

	it('propagates document validation errors and never retries staging', async () => {
		const { useCase, build, write } = setup([file('bad.nd.json')]);
		build.mockRejectedValueOnce(new Error('Invalid document'));
		await expect(useCase.build({ directory: './content', manifestPath: 'config.yaml', outputManifestPath: './compiled.json', filesystemRoot: 'library' }))
			.rejects.toThrow('Invalid document');
		expect(build).toHaveBeenCalledOnce();
		expect(write).not.toHaveBeenCalled();
	});

	it('discards an uncommitted staging generation when the build fails', async () => {
		const { useCase, build, write, discard } = setup([file('bad.nd.json')]);
		build.mockRejectedValueOnce(new Error('staging failed'));
		await expect(useCase.build({ directory: './content', manifestPath: './config.yaml', outputManifestPath: './compiled.json', filesystemRoot: 'library' }))
			.rejects.toThrow('staging failed');
		expect(discard).toHaveBeenCalledOnce();
		expect(write).not.toHaveBeenCalled();
	});

	it('discards staged generation when writing the publication pointer fails', async () => {
		const { useCase, write, discard } = setup([file('valid.nd.json')]);
		write.mockRejectedValueOnce(new Error('manifest write failed'));
		await expect(useCase.build({ directory: './content', manifestPath: './config.yaml', outputManifestPath: './compiled.json', filesystemRoot: 'library' }))
			.rejects.toThrow('manifest write failed');
		expect(discard).toHaveBeenCalledOnce();
	});

	it('rejects source manifests containing existing Resource definitions', async () => {
		const { useCase, build, write, load } = setup([file('valid.nd.json')]);
		const configured = validateManifest({
			version: 1, kind: 37770, staging: { path: '.staging' },
			nostr: { relays: ['wss://relay.example'] },
			resources: { existing: {
				path: 'other.json',
				event: {
					encoding: ['hex'],
					tags: [
						['d', 'legacy'],
						['m', 'application/json+hex'],
						['t', 'normalized-content/document'],
						['dataType', 'kjvonly.normalized-document'],
						['dataVersion', '1'],
						['representation', 'content']
					]
				}
			} }
		});
		load.mockResolvedValueOnce({
			path: '/config/manifest.yaml', directory: '/config', manifest: configured
		});
		await expect(useCase.build({
			directory: './content', manifestPath: 'config.yaml',
			outputManifestPath: './compiled.json', filesystemRoot: 'library'
		})).rejects.toThrow('configuration-only Manifest');
		expect(load).toHaveBeenCalledOnce();
		expect(build).not.toHaveBeenCalled();
		expect(write).not.toHaveBeenCalled();
	});

	it('rejects output that would overwrite the source manifest or become an imported document', async () => {
		const { useCase, build, write } = setup([file('valid.nd.json')]);
		await expect(useCase.build({
			directory: './content', manifestPath: 'config.yaml',
			outputManifestPath: '/config/manifest.yaml', filesystemRoot: 'library'
		})).rejects.toThrow('must not overwrite');
		await expect(useCase.build({
			directory: './content', manifestPath: 'config.yaml',
			outputManifestPath: './output.nd.json', filesystemRoot: 'library'
		})).rejects.toThrow('must not have a .nd.json');
		expect(build).not.toHaveBeenCalled();
		expect(write).not.toHaveBeenCalled();
	});
});
