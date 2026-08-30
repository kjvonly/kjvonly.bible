import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import {
	parseResourceIdentifier
} from '$lib/resource/utils/resource-identifier';

import type {
	ResourceSelections
} from './resource-selections';

export class ResourceSelectionService {

	private readonly selections =
		new Map<
			string,
			PublishedResourceReference
		>();

	constructor(
		initialSelections:
			readonly PublishedResourceReference[] =
				[]
	) {
		for (
			const selection of
			initialSelections
		) {
			this.select(
				selection
			);
		}
	}

	get(
		resourceType: string
	):
		PublishedResourceReference |
		undefined {

		const selection =
			this.selections.get(
				resourceType
			);

		if (!selection) {
			return undefined;
		}

		return {
			...selection
		};
	}

	require(
		resourceType: string
	): PublishedResourceReference {

		const selection =
			this.get(
				resourceType
			);

		if (!selection) {
			throw new Error(
				`No Resource selected for type: ${resourceType}`
			);
		}

		return selection;
	}

	select(
		reference:
			PublishedResourceReference
	): void {

		const {
			resourceType
		} =
			parseResourceIdentifier(
				reference.resourceId
			);

		this.selections.set(
			resourceType,
			{
				...reference
			}
		);
	}

	snapshot():
		ResourceSelections {

		const result:
			ResourceSelections =
				{};

		for (
			const [
				resourceType,
				reference
			] of
			this.selections
		) {
			result[
				resourceType
			] = {
				...reference
			};
		}

		return result;
	}
}