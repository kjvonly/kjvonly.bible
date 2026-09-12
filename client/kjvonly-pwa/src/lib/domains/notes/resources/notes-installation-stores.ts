import type {
	NotesStore
} from '$lib/domains/notes/persistence/notes-store';

import type {
	ResourceInstallationStore
} from '$lib/resource/installation/resource-installation-store';

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
