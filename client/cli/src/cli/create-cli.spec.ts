import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	createCli
} from './create-cli.js';


describe(
	'createCli',
	() => {

	it(
		'routes build to BuildManifest',
		async () => {

			const build =
				vi.fn();


			const cli =
				createCli({
					buildManifest: {
						build
					},

					publishManifest: {
						publish:
							vi.fn()
					},

					syncManifest: {
						sync:
							vi.fn()
					}
				});


			await cli.parseAsync([
				'node',
				'kjvonly',
				'build',
				'./manifest.yaml'
			]);


			expect(
				build
			).toHaveBeenCalledOnce();


			expect(
				build
			).toHaveBeenCalledWith(
				'./manifest.yaml'
			);
		}
	);


	it(
		'routes publish to PublishManifest',
		async () => {

			const publish =
				vi.fn();


			const cli =
				createCli({
					buildManifest: {
						build:
							vi.fn()
					},

					publishManifest: {
						publish
					},

					syncManifest: {
						sync:
							vi.fn()
					}
				});


			await cli.parseAsync([
				'node',
				'kjvonly',
				'publish',
				'./manifest.yaml'
			]);


			expect(
				publish
			).toHaveBeenCalledOnce();


			expect(
				publish
			).toHaveBeenCalledWith(
				'./manifest.yaml'
			);
		}
	);


	it(
		'routes sync to SyncManifest',
		async () => {

			const sync =
				vi.fn();


			const cli =
				createCli({
					buildManifest: {
						build:
							vi.fn()
					},

					publishManifest: {
						publish:
							vi.fn()
					},

					syncManifest: {
						sync
					}
				});


			await cli.parseAsync([
				'node',
				'kjvonly',
				'sync',
				'./manifest.yaml'
			]);


			expect(
				sync
			).toHaveBeenCalledOnce();


			expect(
				sync
			).toHaveBeenCalledWith(
				'./manifest.yaml'
			);
		}
	);
});