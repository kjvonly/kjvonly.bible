import type {
	NotesStore
} from '../persistence/notes-store';

import type {
	ResourcePublicationIntent
} from '$lib/resource';

export interface NotesWriteStores {
	readonly notes:
		Pick<
			NotesStore,
			'put' |
				'delete'
		>;

	readonly outbox: {
		put(
			objectId:
				string,

			resource:
				ResourcePublicationIntent
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
