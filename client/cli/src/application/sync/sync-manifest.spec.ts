import {
	describe,
	expect,
	it,
	vi
} from 'vitest';



import type {
	PublishManifest
} from './publish/publish-manifest.js';

import {
	SyncManifestUseCase
} from './sync-manifest.js';
import { BuildManifest } from './build/build-manifest.js';


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
							async (
								_manifestPath:
									string
							) => {

								calls.push(
									'publish'
								);


								return [];
							}
						)
				};

				const logger = {
					verbose:
						vi.fn()
				};

				const syncManifest =
					new SyncManifestUseCase(
						buildManifest,
						publishManifest,
						logger
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


				expect(
					logger.verbose
				).toHaveBeenNthCalledWith(
					1,
					'sync.build.start',
					{
						manifestPath:
							'./manifest.yaml'
					}
				);


				expect(
					logger.verbose
				).toHaveBeenNthCalledWith(
					2,
					'sync.build.complete',
					{
						manifestPath:
							'./manifest.yaml'
					}
				);


				expect(
					logger.verbose
				).toHaveBeenNthCalledWith(
					3,
					'sync.publish.start',
					{
						manifestPath:
							'./manifest.yaml'
					}
				);

				expect(
					logger.verbose
				).toHaveBeenNthCalledWith(
					4,
					'sync.publish.complete',
					{
						manifestPath:
							'./manifest.yaml'
					}
				);
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

				const logger = {
					verbose:
						vi.fn()
				};

				const syncManifest =
					new SyncManifestUseCase(
						buildManifest,
						publishManifest,
						logger
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