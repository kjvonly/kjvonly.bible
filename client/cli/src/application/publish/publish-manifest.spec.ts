import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	Manifest
} from '../domain/manifest.js';

import type {
	ManifestLoader
} from '../ports/manifest-loader.js';

import type {
	Logger
} from '../ports/logger.js';

import type {
	BlossomArtifactPublisher
} from './blossom-artifact-publisher.js';

import type {
	NostrStagedEventPublisher
} from './nostr-staged-event-publisher.js';

import {
	PublishManifestUseCase
} from './publish-manifest.js';

import type {
	PublicationPreflight
} from './publication-preflight.js';


function createLogger():
	Logger {

	return {
		verbose:
			vi.fn()
	};
}


function createManifest() {

	return {
		version:
			1,

		kind:
			37770,

		staging: {
			path:
				'./.kjvonly'
		},

		nostr: {
			relays: [
				'wss://relay.example'
			]
		},

		strategies:
			{},

		resources:
			{},

		collections:
			{}
	} satisfies Manifest;
}


describe(
	'PublishManifestUseCase',
	() => {

		it(
			'publishes Blossom artifacts before Nostr events and returns both result types',
			async () => {

				const manifest =
					createManifest();


				const calls:
					string[] =
						[];


				const manifestLoader = {
					load:
						vi.fn(
							async () => ({
								manifest,

								directory:
									'/project'
							})
						)
				} as unknown as ManifestLoader;


				const publicationPreflight = {
					check:
						vi.fn(
							async () => {
								calls.push(
									'preflight'
								);
							}
						)
				} as unknown as PublicationPreflight;


				const blossomResult = {
					resourceName:
						'bundle',

					key:
						'bundle',

					sha256:
						'a'.repeat(
							64
						),

					url:
						'https://blossom.example',

					status:
						'uploaded' as const
				};


				const blossomArtifactPublisher = {
					publish:
						vi.fn(
							async () => {
								calls.push(
									'blossom'
								);

								return [
									blossomResult
								];
							}
						)
				} as unknown as BlossomArtifactPublisher;


				const nostrResult = {
					eventId:
						'b'.repeat(
							64
						),

					relay:
						'wss://relay.example',

					status:
						'published' as const
				};


				const nostrStagedEventPublisher = {
					publish:
						vi.fn(
							async () => {
								calls.push(
									'nostr'
								);

								return [
									nostrResult
								];
							}
						)
				} as unknown as NostrStagedEventPublisher;


				const logger =
					createLogger();


				const publisher =
					new PublishManifestUseCase(
						manifestLoader,
						publicationPreflight,
						blossomArtifactPublisher,
						nostrStagedEventPublisher,
						logger
					);


				const results =
					await publisher.publish(
						'/project/manifest.yaml'
					);


				expect(
					calls
				).toEqual([
					'preflight',
					'blossom',
					'nostr'
				]);


				expect(
					blossomArtifactPublisher
						.publish
				).toHaveBeenCalledWith(
					manifest,
					'/project/.kjvonly'
				);


				expect(
					nostrStagedEventPublisher
						.publish
				).toHaveBeenCalledWith(
					manifest,
					'/project/.kjvonly'
				);


				expect(
					results
				).toEqual([
					{
						type:
							'blossom',

						data:
							blossomResult
					},
					{
						type:
							'nostr',

						data:
							nostrResult
					}
				]);



				expect(
					logger.verbose
				).toHaveBeenCalledWith(
					'publish.start',
					{
						manifestPath:
							'/project/manifest.yaml'
					}
				);


				expect(
					logger.verbose
				).toHaveBeenCalledWith(
					'publish.manifest.loaded',
					{
						manifestPath:
							'/project/manifest.yaml',

						resourceCount:
							0,

						collectionCount:
							0
					}
				);


				expect(
					logger.verbose
				).toHaveBeenCalledWith(
					'publish.preflight.complete',
					{
						manifestPath:
							'/project/manifest.yaml'
					}
				);


				expect(
					logger.verbose
				).toHaveBeenCalledWith(
					'publish.blossom.complete',
					{
						resultCount:
							1
					}
				);


				expect(
					logger.verbose
				).toHaveBeenCalledWith(
					'publish.nostr.complete',
					{
						resultCount:
							1
					}
				);


				expect(
					logger.verbose
				).toHaveBeenCalledWith(
					'publish.complete',
					{
						resultCount:
							2
					}
				);
			}
		);
	}
);