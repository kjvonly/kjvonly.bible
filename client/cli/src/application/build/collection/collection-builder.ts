import { Manifest } from '#domain/manifest/manifest.js';
import { ResourceDescriptor } from '#domain/resource/resource-descriptor.js';
import { SignedNostrEvent } from '#domain/event/nostr-event.js';
import { Logger } from '#ports/logging/logger.js';
import { CollectionEventStagingRepository, StagedCollectionEventEntry } from '#ports/staging/collection-event-staging-repository.js';

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


		const builtEvents =
			new Map<
				string,
				SignedNostrEvent
			>();


		const visiting =
			new Set<string>();


		for (
			const collectionName
			of Object.keys(
				request.manifest.collections
			)
		) {
			await this.buildCollection(
				collectionName,
				request,
				stagedByName,
				builtEvents,
				visiting,
				[]
			);
		}


		const currentNames =
			new Set(
				Object.keys(
					request.manifest.collections
				)
			);


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


	private async buildCollection(
		collectionName:
			string,

		request:
			BuildCollectionsRequest,

		stagedByName:
			ReadonlyMap<
				string,
				StagedCollectionEventEntry
			>,

		builtEvents:
			Map<
				string,
				SignedNostrEvent
			>,

		visiting:
			Set<string>,

		path:
			readonly string[]
	): Promise<SignedNostrEvent> {

		const alreadyBuilt =
			builtEvents.get(
				collectionName
			);


		if (
			alreadyBuilt !==
				undefined
		) {
			return alreadyBuilt;
		}


		if (
			visiting.has(
				collectionName
			)
		) {
			throw new Error(
				`Collection dependency cycle: ${[
					...path,
					collectionName
				].join(' -> ')}`
			);
		}


		const collection =
			request
				.manifest
				.collections[
					collectionName
				];


		if (
			collection ===
				undefined
		) {
			throw new Error(
				`Unknown Collection: ${collectionName}`
			);
		}


		visiting.add(
			collectionName
		);


		try {
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


			for (
				const childCollectionName
				of collection.collections
			) {
				const childEvent =
					await this.buildCollection(
						childCollectionName,
						request,
						stagedByName,
						builtEvents,
						visiting,
						[
							...path,
							collectionName
						]
					);


				const childDescriptor =
					this.createCollectionDescriptor(
						childCollectionName,
						childEvent,
						request.manifest.nostr.relays
					);


				this.logCollectionMemberResolved(
					collectionName,
					childCollectionName,
					childDescriptor
						.metadata
						.resourceId
				);


				descriptors.push(
					childDescriptor
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


			builtEvents.set(
				collectionName,
				event
			);


			this.logEventStaged(
				collectionName,
				event.id
			);


			this.logCollectionComplete(
				collectionName,
				descriptors.length
			);


			return event;
		}
		finally {
			visiting.delete(
				collectionName
			);
		}
	}


	private createCollectionDescriptor(
		collectionName:
			string,

		event:
			SignedNostrEvent,

		relays:
			readonly string[]
	): ResourceDescriptor {

		const resourceId =
			this.getRequiredTagValue(
				collectionName,
				event,
				'd'
			);


		const category =
			this.getRequiredTagValue(
				collectionName,
				event,
				't'
			);


		const mediaType =
			this.getRequiredTagValue(
				collectionName,
				event,
				'm'
			);


		const representation =
			this.getRequiredTagValue(
				collectionName,
				event,
				'representation'
			);


		if (
			representation !==
				'descriptors'
		) {
			throw new Error(
				`Nested Collection "${collectionName}" must use representation "descriptors".`
			);
		}


		return {
			metadata: {
				publisher:
					event.pubkey,

				resourceId,

				category,

				modifiedAt:
					event.created_at,

				mediaType
			},

			strategy: {
				type:
					'nostr',

				data: {
					kind:
						event.kind,

					relays: [
						...relays
					]
				}
			}
		};
	}


	private getRequiredTagValue(
		collectionName:
			string,

		event:
			SignedNostrEvent,

		tagName:
			string
	): string {

		const values =
			event.tags
				.filter(
					tag =>
						tag[0] ===
							tagName
				)
				.map(
					tag =>
						tag[1]
				)
				.filter(
					(
						value
					): value is string =>
						value !==
							undefined &&
						value.length >
							0
				);


		if (
			values.length !==
				1
		) {
			throw new Error(
				`Nested Collection "${collectionName}" requires exactly one "${tagName}" tag.`
			);
		}


		return values[0]!;
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


	private logCollectionMemberResolved(
		collectionName:
			string,

		childCollectionName:
			string,

		resourceId:
			string
	): void {

		this.logger.verbose(
			'collection.collection.resolved',
			{
				collectionName,
				childCollectionName,
				resourceId
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
