import type {
	NotesStore
} from '../persistence/notes-store';

import type {
	ResourceInstallationStore
} from '$lib/resource';

export interface NotesInstallationStores {
	readonly notes:
		Pick<
			NotesStore,
			'get' |
			'put'
		>;

	readonly resourceInstallations:
		ResourceInstallationStore;
}

export interface NotesInstallationTransaction {
	run<TResult>(
		operation:
			(
				stores:
					NotesInstallationStores
			) => Promise<TResult>
	): Promise<TResult>;
}
