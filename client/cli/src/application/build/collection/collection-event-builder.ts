import {
	Buffer
} from 'node:buffer';

import type {
	EncodingRegistry
} from '../encoding/encoding-registry.js';

import { EventSigner } from '#ports/nostr/event-signer.js';
import { Clock } from '#ports/time/clock.js';
import { SignedNostrEvent } from '../../../domain/event/nostr-event.js';
import { EventDefinition } from '../../../domain/manifest/manifest.js';
import { ResourceDescriptor } from '../../../domain/resource/resource-descriptor.js';

export interface BuildCollectionEventRequest {
	readonly kind:
		number;

	readonly event:
		EventDefinition;

	readonly descriptors:
		readonly ResourceDescriptor[];

	readonly previousCreatedAt?:
		number;
}


export class CollectionEventBuilder {

	constructor(
		private readonly encodingRegistry:
			EncodingRegistry,

		private readonly signer:
			EventSigner,

		private readonly clock:
			Clock
	) {}


	async build(
		request:
			BuildCollectionEventRequest
	): Promise<
		SignedNostrEvent
	> {

		const now =
			this.clock
				.nowEpochSeconds();


		const createdAt =
			request.previousCreatedAt ===
				undefined
				? now
				: Math.max(
					now,
					request.previousCreatedAt +
						1
				);


		const descriptorBytes =
			Buffer.from(
				JSON.stringify(
					request.descriptors
				),
				'utf8'
			);


		const encodedBytes =
			this.encodingRegistry
				.encode(
					descriptorBytes,
					request
						.event
						.encoding
				);


		return this.signer.sign({
			kind:
				request.kind,

			created_at:
				createdAt,

			tags:
				request
					.event
					.tags
					.map(
						tag => [
							...tag
						]
					),

			content:
				Buffer
					.from(
						encodedBytes
					)
					.toString(
						'utf8'
					)
		});
	}
}