import {
	parseResourceSelections,
	type ResourceSelections,
	type ResourceSelectionStore
} from '$lib/application';

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