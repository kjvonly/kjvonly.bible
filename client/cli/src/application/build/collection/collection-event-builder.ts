import {
	Buffer
} from 'node:buffer';

import type {
	EncodingRegistry
} from './encoding/encoding-registry.js';

import type {
	EventDefinition
} from '../domain/manifest.js';

import type {
	ResourceDescriptor
} from '../domain/resource-descriptor.js';

import type {
	SignedNostrEvent
} from '../domain/nostr-event.js';

import type {
	Clock
} from '../ports/clock.js';

import type {
	EventSigner
} from '../ports/event-signer.js';


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