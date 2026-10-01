import type {
	Event
} from 'nostr-typedef';

import {
	RESOURCE_KIND,
	type ResourceMetadata,
	type ResourceRepresentation,
	type ResourceRepresentationType
} from '$lib/resource/models/resource.model';

import {
	RESOURCE_ENVELOPE_TAGS
} from './resource-envelope-tags';

const RESOURCE_REPRESENTATIONS:
	readonly ResourceRepresentationType[] = [
		'content',
		'descriptors'
	];

/**
 * Maps one Nostr Resource event into the protocol-agnostic Resource envelope.
 *
 * The `d` tag supplies Resource identity and the `t` tag independently supplies
 * Resource Type. Non-envelope scalar tags are preserved as generic Resource
 * metadata for the owning Domain to interpret.
 */
export function toResourceRepresentation(
	event: Event
): ResourceRepresentation {
	if (
		event.kind !==
		RESOURCE_KIND
	) {
		throw new Error(
			`Invalid Resource kind: ${event.kind}`
		);
	}

	const resourceId =
		requireTag(
			event,
			'd'
		);

	const resourceType =
		requireTag(
			event,
			't'
		);

	const representationValue =
		requireTag(
			event,
			'representation'
		);

	if (
		!isResourceRepresentationType(
			representationValue
		)
	) {
		throw new Error(
			`Invalid Resource representation: ${representationValue}`
		);
	}

	const mediaType =
		requireTag(
			event,
			'm'
		);

	const metadata =
		readResourceMetadata(
			event
		);

	return {
		publisher:
			event.pubkey,

		resourceId,

		resourceType,

		eventId:
			event.id,

		modifiedAt:
			event.created_at,

		representation:
			representationValue,

		mediaType,

		...(metadata === undefined
			? {}
			: { metadata }),

		payload:
			event.content
	};
}

/** Reads non-envelope scalar tags as generic Resource metadata. */
function readResourceMetadata(
	event: Event
): ResourceMetadata | undefined {
	const metadata:
		Record<string, string> = {};

	for (const tag of event.tags) {
		const name =
			tag[0];

		const value =
			tag[1];

		if (
			name === undefined ||
			value === undefined ||
			RESOURCE_ENVELOPE_TAGS.has(
				name
			)
		) {
			continue;
		}

		metadata[name] =
			value;
	}

	return Object.keys(
		metadata
	).length === 0
		? undefined
		: metadata;
}

function requireTag(
	event: Event,
	name: string
): string {
	const value =
		event.tags.find(
			(tag) =>
				tag[0] === name
		)?.[1];

	if (!value) {
		throw new Error(
			`Resource event is missing ${name} tag.`
		);
	}

	return value;
}

function isResourceRepresentationType(
	value: string
): value is ResourceRepresentationType {
	return RESOURCE_REPRESENTATIONS
		.includes(
			value as ResourceRepresentationType
		);
}
