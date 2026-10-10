import { describe, expect, it, vi } from 'vitest';

import type { Manifest } from '#domain/manifest/manifest.js';
import { BuildManifestUseCase } from './build-manifest.js';

const manifest: Manifest = {
	version: 1,
	kind: 37770,
	staging: { path: './.kjvonly' },
	nostr: { relays: ['wss://relay.example'] },
	strategies: {},
	resources: {},
	collections: {},
	filesystems: {}
};

function createFixture() {
	const manifestLoader = {
		load: vi.fn(async () => ({
			path: '/content/manifest.yaml',
			directory: '/content',
			manifest
		}))
	};
	const executor = {
		build: vi.fn(async () => {})
	};
	const logger = {
		verbose: vi.fn()
	};

	return {
		manifestLoader,
		executor,
		logger,
		useCase: new BuildManifestUseCase(manifestLoader, executor, logger)
	};
}

describe('BuildManifestUseCase', () => {
	it('delegates the loaded Manifest and its source directory without rebuilding it', async () => {
		const { useCase, manifestLoader, executor, logger } = createFixture();

		await useCase.build('manifest.yaml');

		expect(manifestLoader.load).toHaveBeenCalledTimes(1);
		expect(manifestLoader.load).toHaveBeenCalledWith('manifest.yaml');
		expect(executor.build).toHaveBeenCalledTimes(1);
		expect(executor.build).toHaveBeenCalledWith({
			directory: '/content',
			manifest,
			origin: 'manifest.yaml'
		});
		expect(logger.verbose.mock.calls.map(([event]) => event)).toEqual([
			'build.start',
			'build.manifest.loaded',
			'build.complete'
		]);
		expect(logger.verbose).toHaveBeenCalledWith('build.manifest.loaded', {
			manifestPath: 'manifest.yaml',
			resourceCount: 0,
			collectionCount: 0,
			filesystemCount: 0
		});
	});

	it('does not execute a Manifest when loading fails', async () => {
		const { useCase, manifestLoader, executor, logger } = createFixture();
		manifestLoader.load.mockRejectedValueOnce(new Error('invalid manifest'));

		await expect(useCase.build('manifest.yaml')).rejects.toThrow('invalid manifest');

		expect(executor.build).not.toHaveBeenCalled();
		expect(logger.verbose).not.toHaveBeenCalledWith('build.complete', {
			manifestPath: 'manifest.yaml'
		});
	});

	it('propagates build failure without logging completion', async () => {
		const { useCase, executor, logger } = createFixture();
		executor.build.mockRejectedValueOnce(new Error('failed to stage'));

		await expect(useCase.build('manifest.yaml')).rejects.toThrow('failed to stage');

		expect(logger.verbose).not.toHaveBeenCalledWith('build.complete', {
			manifestPath: 'manifest.yaml'
		});
	});
});
