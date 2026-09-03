import {
	Command
} from 'commander';

import type {
	BuildManifest
} from '../application/build-manifest.js';

import type {
	PublishManifest
} from '../application/publish-manifest.js';

import type {
	SyncManifest
} from '../application/sync-manifest.js';


export interface CliDependencies {
	readonly buildManifest:
		BuildManifest;

	readonly publishManifest:
		PublishManifest;

	readonly syncManifest:
		SyncManifest;
}


export function createCli(
	dependencies:
		CliDependencies
): Command {

	const program =
		new Command();


	program
		.name('kjvonly')
		.description(
			'KJVOnly Resource publishing CLI'
		);


	program
		.command('build')
		.description(
			'Build and stage Resources from a manifest'
		)
		.argument(
			'<manifest>',
			'publication manifest path'
		)
		.action(
			async (
				manifestPath:
					string
			): Promise<void> => {

				await dependencies
					.buildManifest
					.build(
						manifestPath
					);
			}
		);


	program
		.command('publish')
		.description(
			'Publish existing staged Resources'
		)
		.argument(
			'<manifest>',
			'publication manifest path'
		)
		.action(
			async (
				manifestPath:
					string
			): Promise<void> => {

				await dependencies
					.publishManifest
					.publish(
						manifestPath
					);
			}
		);


	program
		.command('sync')
		.description(
			'Build and then publish Resources'
		)
		.argument(
			'<manifest>',
			'publication manifest path'
		)
		.action(
			async (
				manifestPath:
					string
			): Promise<void> => {

				await dependencies
					.syncManifest
					.sync(
						manifestPath
					);
			}
		);


	return program;
}