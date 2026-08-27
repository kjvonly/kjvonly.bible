import type {
	Event
} from 'nostr-typedef';

import {
	RESOURCE_KIND,
	type ResourceRepresentation,
	type ResourceRepresentationType
} from '$lib/resource/models/resource.model';

import {
	extractResourceType
} from '$lib/resource/utils/resource-identifier';

const RESOURCE_REPRESENTATIONS:
	readonly ResourceRepresentationType[] = [
		'content',
		'descriptor',
		'descriptors'
	];

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
		extractResourceType(
			resourceId
		);

	const classification =
		requireTag(
			event,
			't'
		);

	if (
		classification !==
		resourceType
	) {
		throw new Error(
			`Invalid Resource classification: ${classification}`
		);
	}

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

		payload:
			event.content
	};
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