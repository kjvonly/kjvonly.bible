import type {
	ResourceClient
} from './resource-client';

import {
	RESOURCE_KIND,
	type PublishedResourceReference,
	type ResourceRepresentation
} from '$lib/resource/models/resource.model';

import {
	toResourceRepresentation
} from './resource-event';

export class ResourceDiscovery {
	constructor(
		private readonly resourceClient:
			ResourceClient
	) {}

	async get(
		reference:
			PublishedResourceReference
	): Promise<
		ResourceRepresentation |
		null
	> {
		const event =
			await this.resourceClient
				.getEvent({
					kinds: [
						RESOURCE_KIND
					],

					authors: [
						reference.publisher
					],

					'#d': [
						reference.resourceId
					]
				});

		if (
			event === null
		) {
			return null;
		}

		return toResourceRepresentation(
			event
		);
	}
}