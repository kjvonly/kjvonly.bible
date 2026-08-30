import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import {
	parseResourceIdentifier
} from '$lib/resource/utils/resource-identifier';

export type ResourceSelections =
	Record<
		string,
		PublishedResourceReference
	>;

export function requireResourceSelection(
	selections:
		ResourceSelections |
		undefined,

	resourceType:
		string
): PublishedResourceReference {

	const selection =
		selections?.[
			resourceType
		];

	if (!selection) {
		throw new Error(
			`No Resource selection for type: ${resourceType}`
		);
	}

	return selection;
}


export function parseResourceSelections(
	value: unknown
): ResourceSelections {

	if (
		typeof value !== 'object' ||
		value === null ||
		Array.isArray(value)
	) {
		throw new Error(
			'Invalid Resource selections'
		);
	}

	const selections:
		ResourceSelections =
			{};

	for (
		const [
			resourceType,
			rawReference
		] of Object.entries(value)
	) {
		if (
			typeof rawReference !== 'object' ||
			rawReference === null ||
			Array.isArray(rawReference)
		) {
			throw new Error(
				`Invalid Resource selection: ${resourceType}`
			);
		}

		const reference =
			rawReference as
				Record<string, unknown>;

		if (
			typeof reference.publisher !==
				'string' ||
			reference.publisher.length === 0 ||
			typeof reference.resourceId !==
				'string'
		) {
			throw new Error(
				`Invalid Resource selection: ${resourceType}`
			);
		}

		const identifier =
			parseResourceIdentifier(
				reference.resourceId
			);

		if (
			identifier.resourceType !==
			resourceType
		) {
			throw new Error(
				`Resource selection type mismatch: ${resourceType}`
			);
		}

		selections[
			resourceType
		] = {
			publisher:
				reference.publisher,

			resourceId:
				reference.resourceId
		};
	}

	return selections;
}