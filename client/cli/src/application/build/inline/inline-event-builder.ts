import {
	Buffer
} from 'node:buffer';

import type {
	EncodingRegistry
} from '../encoding/encoding-registry.js';


import { SourceRepository } from '#ports/source/source-repository.js';
import { EventSigner } from '#ports/nostr/event-signer.js';
import { Clock } from '#ports/time/clock.js';
import { SignedNostrEvent } from '#domain/event/nostr-event.js';
import { ConcreteSource } from '#domain/source/concrete-source.js';




export class InlineEventBuilder {

	constructor(
		private readonly sourceRepository:
			SourceRepository,

		private readonly encodingRegistry:
			EncodingRegistry,

		private readonly signer:
			EventSigner,

		private readonly clock:
			Clock
	) {}


	async build(
		source:
			ConcreteSource,

		kind:
			number,

		previousCreatedAt?:
			number
	): Promise<
		SignedNostrEvent
	> {

		if (
			source.objectUpload !==
				undefined
		) {
			throw new Error(
				`Resource "${source.resourceName}" is descriptor-backed and cannot be built as inline content.`
			);
		}


		const sourceBytes =
			await this.sourceRepository
				.readFile(
					source.path
				);


		const encodedBytes =
			this.encodingRegistry
				.encode(
					sourceBytes,
					source.event
						.encoding
				);


		const content =
			Buffer
				.from(
					encodedBytes
				)
				.toString(
					'utf8'
				);


		const now =
			this.clock
				.nowEpochSeconds();


		const createdAt =
			previousCreatedAt ===
				undefined
				? now
				: Math.max(
					now,
					previousCreatedAt + 1
				);


		return this.signer.sign({
			kind,

			created_at:
				createdAt,

			tags:
				source.event
					.tags
					.map(
						tag => [
							...tag
						]
					),

			content
		});
	}
}