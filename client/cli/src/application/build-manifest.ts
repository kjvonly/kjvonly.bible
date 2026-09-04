import {
	resolve
} from 'node:path';

import {
	calculateEventDefinitionRevision
} from '../domain/event-definition-revision.js';

import type {
	Manifest
} from '../domain/manifest.js';

import type {
	EventSigner
} from '../ports/event-signer.js';

import type {
	ManifestLoader
} from '../ports/manifest-loader.js';

import type {
	SignedEventStagingRepository,
	StagedEventEntry
} from '../ports/signed-event-staging-repository.js';

import type {
	SourceRepository
} from '../ports/source-repository.js';

import {
	InlineEventBuilder
} from './inline-event-builder.js';

import {
	SourceExpander
} from './source-expander.js';


export interface BuildManifest {
	build(
		manifestPath:
			string
	): Promise<void>;
}


export class BuildManifestUseCase
	implements BuildManifest {

	constructor(
		private readonly manifestLoader:
			ManifestLoader,

		private readonly sourceExpander:
			SourceExpander,

		private readonly sourceRepository:
			SourceRepository,

		private readonly eventBuilder:
			InlineEventBuilder,

		private readonly signer:
			EventSigner,

		private readonly stagingRepository:
			SignedEventStagingRepository
	) {}


	async build(
		manifestPath:
			string
	): Promise<void> {

		const loaded =
			await this.manifestLoader.load(
				manifestPath
			);


		this.assertSupportedManifest(
			loaded.manifest
		);


		const stagingRoot =
			resolve(
				loaded.directory,
				loaded
					.manifest
					.staging
					.path
			);


		const publisher =
			await this.signer
				.getPublicKey();


		for (
			const [
				resourceName,
				resource
			]
			of Object.entries(
				loaded
					.manifest
					.resources
			)
		) {
			const sources =
				await this.sourceExpander
					.expand({
						manifestDirectory:
							loaded.directory,

						resourceName,

						resource
					});


			const staged =
				await this
					.stagingRepository
					.list(
						stagingRoot,
						resourceName
					);


			const stagedByKey =
				new Map<
					string,
					StagedEventEntry
				>(
					staged.map(
						entry => [
							entry.metadata.key,
							entry
						]
					)
				);


			const currentKeys =
				new Set<string>();


			for (
				const source
				of sources
			) {
				currentKeys.add(
					source.key
				);


				const sourceMetadata =
					await this
						.sourceRepository
						.getFileMetadata(
							source.path
						);


				const definitionRevision =
					calculateEventDefinitionRevision({
						kind:
							loaded
								.manifest
								.kind,

						event:
							source.event,

						publisher
					});


				const previous =
					stagedByKey.get(
						source.key
					);


				let previousEvent;


				if (
					previous !==
						undefined
				) {
					previousEvent =
						await this
							.stagingRepository
							.read(
								previous
							);


					const unchanged =
						previous
							.metadata
							.sourceMtimeMs ===
								sourceMetadata
									.mtimeMs &&
						previous
							.metadata
							.sourceSize ===
								sourceMetadata
									.size &&
						previous
							.metadata
							.definitionRevision ===
								definitionRevision &&
						previousEvent
							.pubkey ===
								publisher;


					if (
						unchanged
					) {
						continue;
					}
				}


				const event =
					await this.eventBuilder
						.build(
							source,
							loaded
								.manifest
								.kind,
							previousEvent
								?.created_at
						);


				await this
					.stagingRepository
					.stage({
						stagingRoot,

						resourceName,

						key:
							source.key,

						sourceMtimeMs:
							sourceMetadata
								.mtimeMs,

						sourceSize:
							sourceMetadata
								.size,

						definitionRevision,

						event,

						previous
					});
			}


			for (
				const entry
				of staged
			) {
				if (
					!currentKeys.has(
						entry.metadata.key
					)
				) {
					await this
						.stagingRepository
						.remove(
							entry
						);
				}
			}
		}
	}


	private assertSupportedManifest(
		manifest:
			Manifest
	): void {

		if (
			Object.keys(
				manifest.collections
			).length > 0
		) {
			throw new Error(
				'Collection building is not implemented yet.'
			);
		}


		for (
			const [
				resourceName,
				resource
			]
			of Object.entries(
				manifest.resources
			)
		) {
			if (
				resource[
					'object-upload'
				] !== undefined
			) {
				throw new Error(
					`Resource "${resourceName}" uses object-upload, which is not implemented yet.`
				);
			}
		}
	}
}