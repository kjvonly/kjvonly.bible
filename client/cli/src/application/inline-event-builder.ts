import {
	Buffer
} from 'node:buffer';

import type {
	EncodingRegistry
} from './encoding/encoding-registry.js';

import type {
	ConcreteSource
} from '../domain/concrete-source.js';

import type {
	SignedNostrEvent
} from '../domain/nostr-event.js';

import type {
	Clock
} from '../ports/clock.js';

import type {
	EventSigner
} from '../ports/event-signer.js';

import type {
	SourceRepository
} from '../ports/source-repository.js';


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