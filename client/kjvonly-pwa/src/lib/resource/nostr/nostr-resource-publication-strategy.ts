import type {
	ResourceContentEncoder
} from '$lib/resource/content/resource-content-encoder';

import type {
	NostrClient
} from '$lib/infrastructure/nostr/client/nostr-client';

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
	OutboxPublicationIntent
} from '$lib/application/outbox/outbox-publication-intent';

import type {
	OutboxPublicationStrategy
} from '$lib/application/outbox/outbox-publication-strategy';

const NOSTR_DELETION_KIND = 5;

export class NostrResourcePublicationStrategy
	implements OutboxPublicationStrategy {
	readonly type =
		'resource';

	constructor(
		private readonly client:
			Pick<
				NostrClient,
				'getPublicKey' |
					'publishEvent'
			>,

		private readonly contentEncoder:
			Pick<
				ResourceContentEncoder,
				'encode'
			>
	) {}

	async publish(
		publication:
			OutboxPublicationIntent
	): Promise<void> {
		if (
			publication.type !==
			this.type
		) {
			throw new Error(
				`NostrResourcePublicationStrategy cannot publish Outbox type: ${publication.type}`
			);
		}

		const resource =
			publication as
				ResourcePublicationIntent;
		const pubkey =
			await this.client
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

		await this.publishEvent(
			{
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
			},
			resource.resourceId
		);
	}

	private async publishDeletion(
		resource:
			ResourceDeletionPublication
	): Promise<void> {
		await this.publishEvent(
			{
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
			},
			resource.resourceId
		);
	}

	private async publishEvent(
		event:
			Parameters<
				NostrClient['publishEvent']
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
