import type {
	EventSigner
} from 'rx-nostr';

import type {
	ResourceContentEncoder
} from '$lib/resource/content/resource-content-encoder';

import type {
	ResourceClient
} from '$lib/resource/nostr/resource-client';

import {
	RESOURCE_KIND
} from '$lib/resource/models/resource.model';

import {
	isResourceDeletionPublication,
	type ResourceDeletionPublication,
	type ResourcePublication,
	type ResourcePublicationIntent
} from '$lib/resource/publication/resource-publication';

import type {
	ResourcePublisher
} from '$lib/resource/publication/resource-publisher';

const NOSTR_DELETION_KIND = 5;

export class NostrResourcePublisher
	implements ResourcePublisher {

	constructor(
		private readonly signer:
			Pick<
				EventSigner,
				'getPublicKey' |
					'signEvent'
			>,

		private readonly client:
			Pick<
				ResourceClient,
				'publishEvent'
			>,

		private readonly contentEncoder:
			Pick<
				ResourceContentEncoder,
				'encode'
			>
	) {}

	async publish(
		resource:
			ResourcePublicationIntent
	): Promise<void> {
		const pubkey =
			await this.signer
				.getPublicKey();

		if (
			pubkey !==
			resource.publisher
		) {
			throw new Error(
				`Resource publisher does not match configured signer: ${resource.publisher}`
			);
		}

		if (
			isResourceDeletionPublication(
				resource
			)
		) {
			await this.publishDeletion(
				resource
			);

			return;
		}

		await this.publishResource(
			resource
		);
	}

	private async publishResource(
		resource:
			ResourcePublication
	): Promise<void> {
		const content =
			await this.contentEncoder
				.encode(
					resource
				);

		const event =
			await this.signer
				.signEvent({
					kind:
						RESOURCE_KIND,

					tags: [
						[
							'd',
							resource.resourceId
						],
						[
							'm',
							resource.mediaType
						],
						[
							't',
							resource.resourceType
						],
						[
							'representation',
							resource.representation
						]
					],

					content
				});

		await this.publishEvent(
			event,
			resource.resourceId
		);
	}

	private async publishDeletion(
		resource:
			ResourceDeletionPublication
	): Promise<void> {
		const event =
			await this.signer
				.signEvent({
					kind:
						NOSTR_DELETION_KIND,

					tags: [
						[
							'a',
							`${RESOURCE_KIND}:${resource.publisher}:${resource.resourceId}`
						],
						[
							'k',
							`${RESOURCE_KIND}`
						]
					],

					content:
						''
				});

		await this.publishEvent(
			event,
			resource.resourceId
		);
	}

	private async publishEvent(
		event:
			Parameters<
				ResourceClient['publishEvent']
			>[0],
		resourceId: string
	): Promise<void> {
		const result =
			await this.client
				.publishEvent(
					event
				);

		if (
			!result.acceptedByAnyRelay
		) {
			throw new Error(
				`Resource publication was rejected by all configured relays: ${resourceId}`
			);
		}
	}
}
