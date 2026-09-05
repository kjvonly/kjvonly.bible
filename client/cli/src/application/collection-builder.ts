import type {
	Manifest
} from '../domain/manifest.js';

import type {
	ResourceDescriptor
} from '../domain/resource-descriptor.js';

import type {
	CollectionEventStagingRepository,
	StagedCollectionEventEntry
} from '../ports/collection-event-staging-repository.js';

import {
	CollectionEventBuilder
} from './collection-event-builder.js';


export interface BuildCollectionsRequest {
	readonly manifest:
		Manifest;

	readonly stagingRoot:
		string;

	readonly descriptorsByResource:
		ReadonlyMap<
			string,
			readonly ResourceDescriptor[]
		>;
}


export class CollectionBuilder {

	constructor(
		private readonly eventBuilder:
			CollectionEventBuilder,

		private readonly stagingRepository:
			CollectionEventStagingRepository
	) {}


	async build(
		request:
			BuildCollectionsRequest
	): Promise<void> {

		const staged =
			await this
				.stagingRepository
				.list(
					request.stagingRoot
				);


		const stagedByName =
			new Map<
				string,
				StagedCollectionEventEntry
			>(
				staged.map(
					entry => [
						entry.collectionName,
						entry
					]
				)
			);


		const currentNames =
			new Set<string>();


		for (
			const [
				collectionName,
				collection
			]
			of Object.entries(
				request
					.manifest
					.collections
			)
		) {
			currentNames.add(
				collectionName
			);


			const descriptors:
				ResourceDescriptor[] =
					[];


			for (
				const resourceName
				of collection.resources
			) {
				const resourceDescriptors =
					request
						.descriptorsByResource
						.get(
							resourceName
						);


				if (
					resourceDescriptors ===
						undefined
				) {
					throw new Error(
						`Collection "${collectionName}" Resource "${resourceName}" did not produce descriptors.`
					);
				}


				descriptors.push(
					...resourceDescriptors
				);
			}


			const previous =
				stagedByName.get(
					collectionName
				);


			const previousEvent =
				previous ===
					undefined
					? undefined
					: await this
						.stagingRepository
						.read(
							previous
						);


			const event =
				await this.eventBuilder
					.build({
						kind:
							request
								.manifest
								.kind,

						event:
							collection.event,

						descriptors,

						previousCreatedAt:
							previousEvent
								?.created_at
					});


			await this
				.stagingRepository
				.stage({
					stagingRoot:
						request.stagingRoot,

					collectionName,

					event,

					previous
				});
		}


		for (
			const entry
			of staged
		) {
			if (
				!currentNames.has(
					entry.collectionName
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