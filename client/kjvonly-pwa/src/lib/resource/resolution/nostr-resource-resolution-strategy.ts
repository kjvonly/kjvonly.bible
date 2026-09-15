import type {
	Event
} from 'nostr-typedef';

import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	NostrClient
} from '$lib/infrastructure/nostr/client/nostr-client';

import type {
	ResourceResolutionStrategy
} from './resource-resolution-strategy';

interface NostrStrategyData {
	readonly kind:
		number;

	readonly relays:
		readonly string[];
}

export class NostrResourceResolutionStrategy
	implements ResourceResolutionStrategy {

	readonly type =
		'nostr';

	constructor(
		private readonly nostrClient:
			Pick<
				NostrClient,
				'getEvent'
			>
	) {}

	async resolve(
		descriptor:
			ResourceDescriptor
	): Promise<
		Uint8Array
	> {
		const data =
			validateStrategyData(
				descriptor.strategy.data
			);

		const event =
			await this.nostrClient.getEvent(
				{
					kinds: [
						data.kind
					],

					authors: [
						descriptor.metadata.publisher
					],

					'#d': [
						descriptor.metadata.resourceId
					]
				},
				{
					relays:
						data.relays
				}
			);

		if (
			event ===
			null
		) {
			throw new Error(
				'Nostr Resource not found.'
			);
		}

		validateResolvedEvent(
			event,
			descriptor,
			data.kind
		);

		return new TextEncoder()
			.encode(
				event.content
			);
	}
}

function validateStrategyData(
	value:
		unknown
): NostrStrategyData {
	if (
		!isObject(
			value
		)
	) {
		throw new Error(
			'Invalid Nostr strategy data.'
		);
	}

	const kind =
		value.kind;

	if (
		typeof kind !==
			'number' ||
		!Number.isSafeInteger(
			kind
		) ||
		kind < 0
	) {
		throw new Error(
			'Invalid Nostr strategy kind.'
		);
	}

	const relays =
		value.relays;

	if (
		!Array.isArray(
			relays
		) ||
		relays.length ===
		0 ||
		!relays.every(
			(relay) =>
				typeof relay ===
					'string' &&
				relay.length >
					0 &&
				isValidRelayUrl(
					relay
				)
		)
	) {
		throw new Error(
			'Invalid Nostr strategy relays.'
		);
	}

	return {
		kind,
		relays:
			relays as string[]
	};
}

function validateResolvedEvent(
	event:
		Event,

	descriptor:
		ResourceDescriptor,

	kind:
		number
): void {
	if (
		event.kind !==
		kind
	) {
		throw new Error(
			'Nostr Resource kind mismatch.'
		);
	}

	if (
		event.pubkey !==
		descriptor.metadata.publisher
	) {
		throw new Error(
			'Nostr Resource publisher mismatch.'
		);
	}

	if (
		event.created_at !==
		descriptor.metadata.modifiedAt
	) {
		throw new Error(
			'Nostr Resource modifiedAt mismatch.'
		);
	}

	validateTag(
		event,
		'd',
		descriptor.metadata.resourceId,
		'resourceId'
	);

	validateTag(
		event,
		't',
		descriptor.metadata.category,
		'category'
	);

	validateTag(
		event,
		'representation',
		descriptor.metadata.representation,
		'representation'
	);

	validateTag(
		event,
		'm',
		descriptor.metadata.mediaType,
		'mediaType'
	);
}

function validateTag(
	event:
		Event,

	name:
		string,

	expected:
		string,

	label:
		string
): void {
	const value =
		event.tags.find(
			(tag) =>
				tag[0] ===
				name
		)?.[1];

	if (
		value !==
		expected
	) {
		throw new Error(
			`Nostr Resource ${label} mismatch.`
		);
	}
}

function isValidRelayUrl(
	value:
		string
): boolean {
	try {
		const url =
			new URL(
				value
			);

		return (
			url.protocol ===
				'ws:' ||
			url.protocol ===
				'wss:'
		);
	} catch {
		return false;
	}
}

function isObject(
	value:
		unknown
): value is Record<string, unknown> {
	return (
		typeof value ===
			'object' &&
		value !==
			null &&
		!Array.isArray(
			value
		)
	);
}
