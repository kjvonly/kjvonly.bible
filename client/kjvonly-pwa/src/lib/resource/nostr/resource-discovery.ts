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
	async listByType(
		publisher:
			string,
		resourceType:
			string
	): Promise<readonly ResourceRepresentation[]> {
		const events =
			await this.resourceClient
				.getEvents({
					kinds: [
						RESOURCE_KIND
					],

					authors: [
						publisher
					],

					'#t': [
						resourceType
					]
				});

		const current =
			new Map<
				string,
				ResourceRepresentation
			>();

		for (
			const event of events
		) {
			const resource =
				toResourceRepresentation(
					event
				);

			if (
				resource.publisher !==
					publisher ||
				resource.resourceType !==
					resourceType
			) {
				continue;
			}

			const existing =
				current.get(
					resource.resourceId
				);

			if (
				existing !==
					undefined &&
				existing.modifiedAt >=
					resource.modifiedAt
			) {
				continue;
			}

			current.set(
				resource.resourceId,
				resource
			);
		}

		return [
			...current.values()
		];
	}

}