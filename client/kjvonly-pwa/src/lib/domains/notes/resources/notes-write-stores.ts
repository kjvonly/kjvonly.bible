import type {
	NotesStore
} from '$lib/domains/notes/persistence/notes-store';

import type {
	ResourcePublication
} from '$lib/resource/publication/resource-publication';

export interface NotesWriteStores {
	readonly notes:
		Pick<
			NotesStore,
			'put'
		>;

	readonly outbox: {
		put(
			objectId:
				string,

			resource:
				ResourcePublication
		): Promise<void>;
	};
}

export interface NotesWriteTransaction {
	run<TResult>(
		operation:
			(
				stores:
					NotesWriteStores
			) => Promise<TResult>
	): Promise<TResult>;
}
