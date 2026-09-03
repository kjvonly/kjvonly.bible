import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	BuildManifest
} from './build-manifest.js';

import type {
	PublishManifest
} from './publish-manifest.js';

import {
	SyncManifestUseCase
} from './sync-manifest.js';


describe(
	'SyncManifestUseCase',
	() => {

		it(
			'builds before publishing',
			async () => {

				const calls:
					string[] = [];


				const buildManifest:
					BuildManifest = {
						build:
							vi.fn(
								async () => {
									calls.push(
										'build'
									);
								}
							)
					};


				const publishManifest:
					PublishManifest = {
						publish:
							vi.fn(
								async () => {
									calls.push(
										'publish'
									);
								}
							)
					};


				const syncManifest =
					new SyncManifestUseCase(
						buildManifest,
						publishManifest
					);


				await syncManifest.sync(
					'./manifest.yaml'
				);


				expect(
					calls
				).toEqual([
					'build',
					'publish'
				]);
			}
		);


		it(
			'does not publish when build fails',
			async () => {

				const buildManifest:
					BuildManifest = {
						build:
							vi.fn(
								async () => {
									throw new Error(
										'build failed'
									);
								}
							)
					};


				const publishManifest:
					PublishManifest = {
						publish:
							vi.fn()
					};


				const syncManifest =
					new SyncManifestUseCase(
						buildManifest,
						publishManifest
					);


				await expect(
					syncManifest.sync(
						'./manifest.yaml'
					)
				).rejects.toThrow(
					'build failed'
				);


				expect(
					publishManifest
						.publish
				).not.toHaveBeenCalled();
			}
		);
	}
);