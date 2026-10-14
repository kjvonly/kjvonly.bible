import type { ResourcePublicationIntent } from '$lib/resource';
import type { BookmarksStore } from '../persistence/bookmarks-store';

/** One transaction scopes both local accepted state and queued publication. */
export interface BookmarksWriteStores {
	readonly bookmarks: Pick<BookmarksStore, 'put' | 'delete'>;
	readonly outbox: {
		put(bookmarkId: string, resource: ResourcePublicationIntent): Promise<void>;
	};
}

export interface BookmarksWriteTransaction {
	run<TResult>(operation: (stores: BookmarksWriteStores) => Promise<TResult>): Promise<TResult>;
}
