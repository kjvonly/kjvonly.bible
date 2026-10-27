import type {
	ResourceSelections
} from './resource-selections';

export interface ResourceSelectionStore {

	load():
		ResourceSelections |
		undefined;

	save(
		selections:
			ResourceSelections
	): void;
}