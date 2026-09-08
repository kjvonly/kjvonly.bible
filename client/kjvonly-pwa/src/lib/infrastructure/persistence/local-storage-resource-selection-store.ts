import type {
	ResourceSelectionStore
} from '$lib/application/resources/resource-selection-store';

import type {
	ResourceSelections
} from '$lib/application/resources/resource-selections';

import {
	parseResourceSelections
} from '$lib/application/resources/resource-selections';

const STORAGE_KEY =
	'resourceSelections';

export class LocalStorageResourceSelectionStore
	implements ResourceSelectionStore {

	constructor(
		private readonly storage:
			Pick<
				Storage,
				'getItem' |
				'setItem'
			>
	) {}

	load():
		ResourceSelections |
		undefined {

		const serialized =
			this.storage.getItem(
				STORAGE_KEY
			);

		if (serialized === null) {
			return undefined;
		}

		return parseResourceSelections(
			JSON.parse(
				serialized
			)
		);
	}

	save(
		selections:
			ResourceSelections
	): void {

		this.storage.setItem(
			STORAGE_KEY,
			JSON.stringify(
				selections
			)
		);
	}
}