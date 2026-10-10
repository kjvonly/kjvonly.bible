import { Manifest } from '#domain/manifest/manifest.js';
import { ResourceDescriptor } from '#domain/resource/resource-descriptor.js';
import { SignedNostrEvent } from '#domain/event/nostr-event.js';
import { calculateCollectionInputRevision } from '#domain/collection/collection-input-revision.js';
import { Logger } from '#ports/logging/logger.js';
import { CollectionEventStagingRepository, StagedCollectionEventEntry } from '#ports/staging/collection-event-staging-repository.js';

import {
	CollectionEventBuilder
} from './collection-event-builder.js';

import {
	NostrEventResourceDescriptorBuilder
} from '../descriptor/nostr-event-resource-descriptor-builder.js';


/** Inputs required to reconcile manifest Collections into local signed staging. */
export interface BuildCollectionsRequest {
	/** Fully rendered and validated CLI manifest. */
	readonly manifest:
		Manifest;

	/** Root containing already-built Resource and Collection staging. */
	readonly stagingRoot:
		string;

	/** Public key expected to sign generated Collection Resource events. */
	readonly publisher:
		string;

	/** Resource descriptors already produced by earlier build phases. */
	readonly descriptorsByResource:
		ReadonlyMap<
			string,
			readonly ResourceDescriptor[]
		>;
}


/**
 * Builds manifest Collections after Resource descriptors are available.
 *
 * Exact signed Collection events are reused when their semantic input revision
 * and signer are unchanged. Nested Collections are resolved recursively first,
 * so a changed child event naturally invalidates only dependent parents.
 */
export class CollectionBuilder {

	constructor(
		private readonly eventBuilder:
			CollectionEventBuilder,

		private readonly nostrEventResourceDescriptorBuilder:
			NostrEventResourceDescriptorBuilder,

		private readonly stagingRepository:
			CollectionEventStagingRepository,

		private readonly logger:
			Logger
	) {}


	/** Reconciles every manifest Collection and removes obsolete local staging. */
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
					this
						.nostrEventResourceDescriptorBuilder
						.build({
							resourceName:
								childCollectionName,

							event:
								childEvent,

							relays:
								request
									.manifest
									.nostr
									.relays
						});


				if (
					childDescriptor
						.metadata
						.representation !==
							'descriptors'
				) {
					throw new Error(
						`Nested Collection "${childCollectionName}" must use representation "descriptors".`
					);
				}


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


			const inputRevision =
				calculateCollectionInputRevision({
					kind:
						request.manifest.kind,
					publisher:
						request.publisher,
					event:
						collection.event,
					descriptors
				});


			const previous =
				stagedByName.get(
					collectionName
				);


			let previousEvent:
				SignedNostrEvent |
				undefined;


			if (
				previous !== undefined &&
				previous.inputRevision === inputRevision
			) {
				previousEvent =
					await this
						.stagingRepository
						.read(
							previous
						);


				if (
					previousEvent.pubkey ===
						request.publisher
				) {
					builtEvents.set(
						collectionName,
						previousEvent
					);


					this.logEventReused(
						collectionName,
						previous.eventId
					);


					this.logCollectionComplete(
						collectionName,
						descriptors.length
					);


					return previousEvent;
				}
			}


			if (
				previous !== undefined &&
				previousEvent === undefined
			) {
				previousEvent =
					await this
						.stagingRepository
						.read(
							previous
						);
			}


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

					inputRevision,

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


	private logEventReused(
		collectionName:
			string,

		eventId:
			string
	): void {
		this.logger.verbose(
			'collection.event.reused',
			{
				collectionName,
				eventId
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
