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
	ResourceDescriptor,
	ResourceDescriptorStrategy
} from '../domain/resource-descriptor.js';

import type {
	SignedNostrEvent
} from '../domain/nostr-event.js';

import type {
	StagedArtifactEntry
} from '../ports/artifact-staging-repository.js';

import type {
	Clock
} from '../ports/clock.js';

import type {
	EventSigner
} from '../ports/event-signer.js';

import {
	ResourceDescriptorBuilder
} from './resource-descriptor-builder.js';


export interface BuildDescriptorEventRequest {
	readonly source:
		ConcreteSource;

	readonly artifact:
		StagedArtifactEntry;

	readonly strategy:
		ResourceDescriptorStrategy;

	readonly publisher:
		string;

	readonly kind:
		number;

	readonly previousCreatedAt?:
		number;
}


export interface DescriptorEventBuildResult {
	readonly descriptor:
		ResourceDescriptor;

	readonly event:
		SignedNostrEvent;
}


export class DescriptorEventBuilder {

	constructor(
		private readonly encodingRegistry:
			EncodingRegistry,

		private readonly signer:
			EventSigner,

		private readonly clock:
			Clock,

		private readonly descriptorBuilder:
			ResourceDescriptorBuilder
	) {}


	async build(
		request:
			BuildDescriptorEventRequest
	): Promise<
		DescriptorEventBuildResult
	> {

		const now =
			this.clock
				.nowEpochSeconds();


		const revision =
			request.previousCreatedAt ===
				undefined
				? now
				: Math.max(
					now,
					request.previousCreatedAt +
						1
				);


		const descriptor =
			this.descriptorBuilder
				.build({
					source:
						request.source,

					artifact:
						request.artifact,

					publisher:
						request.publisher,

					modifiedAt:
						revision,

					strategy:
						request.strategy
				});


		const descriptorBytes =
			Buffer.from(
				JSON.stringify([
					descriptor
				]),
				'utf8'
			);


		const encodedBytes =
			this.encodingRegistry
				.encode(
					descriptorBytes,
					request
						.source
						.event
						.encoding
				);


		const event =
			await this.signer
				.sign({
					kind:
						request.kind,

					created_at:
						revision,

					tags:
						request
							.source
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


		return {
			descriptor,
			event
		};
	}
}