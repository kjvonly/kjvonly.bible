import {
	Command
} from 'commander';

import type {
	PublishManifest
} from '../application/publish-manifest.js';

import type {
	SyncManifest
} from '../application/sync-manifest.js';

import { BuildManifest } from '../application/build/build-manifest.js';


export interface CliDependencies {
	readonly buildManifest:
	BuildManifest;

	readonly publishManifest:
	PublishManifest;

	readonly syncManifest:
	SyncManifest;

	readonly setVerbose:
	(
		enabled:
			boolean
	) => void;
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
		)
		.option(
			'-v, --verbose',
			'output verbose execution tracing'
		);


	program.hook(
		'preAction',
		(
			_thisCommand,
			actionCommand
		) => {

			const options =
				actionCommand
					.optsWithGlobals();


			dependencies.setVerbose(
				options.verbose ===
				true
			);
		}
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