
import { Manifest } from '../../../domain/manifest/manifest.js';
import { ResourceDescriptor } from '../../../domain/resource/resource-descriptor.js';
import { Logger } from '../../../ports/logging/logger.js';
import { CollectionEventStagingRepository, StagedCollectionEventEntry } from '../../../ports/staging/collection-event-staging-repository.js';

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
			CollectionEventStagingRepository,

		private readonly logger:
			Logger
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


		this.logBuildStart(
			Object.keys(
				request.manifest.collections
			).length,
			staged.length
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


			this.logCollectionStart(
				collectionName,
				collection.resources.length
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


				this.logMemberResolved(
					collectionName,
					resourceName,
					resourceDescriptors.length
				);


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


			this.logEventBuild(
				collectionName,
				descriptors.length,
				previous !==
					undefined
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


			this.logEventStaged(
				collectionName,
				event.id
			);


			this.logCollectionComplete(
				collectionName,
				descriptors.length
			);
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
				this.logCollectionRemoved(
					entry.collectionName
				);


				await this
					.stagingRepository
					.remove(
						entry
					);
			}
		}


		this.logBuildComplete(
			currentNames.size
		);
	}


	private logBuildStart(
		collectionCount:
			number,

		stagedCount:
			number
	): void {

		this.logger.verbose(
			'collection.build.start',
			{
				collectionCount,
				stagedCount
			}
		);
	}


	private logCollectionStart(
		collectionName:
			string,

		resourceCount:
			number
	): void {

		this.logger.verbose(
			'collection.start',
			{
				collectionName,
				resourceCount
			}
		);
	}


	private logMemberResolved(
		collectionName:
			string,

		resourceName:
			string,

		descriptorCount:
			number
	): void {

		this.logger.verbose(
			'collection.member.resolved',
			{
				collectionName,
				resourceName,
				descriptorCount
			}
		);
	}


	private logEventBuild(
		collectionName:
			string,

		descriptorCount:
			number,

		hasPrevious:
			boolean
	): void {

		this.logger.verbose(
			'collection.event.build',
			{
				collectionName,
				descriptorCount,
				hasPrevious
			}
		);
	}


	private logEventStaged(
		collectionName:
			string,

		eventId:
			string
	): void {

		this.logger.verbose(
			'collection.event.staged',
			{
				collectionName,
				eventId
			}
		);
	}


	private logCollectionComplete(
		collectionName:
			string,

		descriptorCount:
			number
	): void {

		this.logger.verbose(
			'collection.complete',
			{
				collectionName,
				descriptorCount
			}
		);
	}


	private logCollectionRemoved(
		collectionName:
			string
	): void {

		this.logger.verbose(
			'collection.removed',
			{
				collectionName
			}
		);
	}


	private logBuildComplete(
		collectionCount:
			number
	): void {

		this.logger.verbose(
			'collection.build.complete',
			{
				collectionCount
			}
		);
	}
}
