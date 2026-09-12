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

import type {
	ResourcePublication
} from '$lib/resource/publication/resource-publication';

import type {
	ResourcePublisher
} from '$lib/resource/publication/resource-publisher';

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
			ResourcePublication
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

		const result =
			await this.client
				.publishEvent(
					event
				);

		if (
			!result.acceptedByAnyRelay
		) {
			throw new Error(
				`Resource publication was rejected by all configured relays: ${resource.resourceId}`
			);
		}
	}
}
