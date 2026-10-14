/** One Bookmark per stable owner/UUID ID; relocation never changes that identity. */
export interface Bookmark {
	readonly id: string;
	readonly target: BookmarkTarget;
	/** User-facing last creation/relocation time in Unix epoch milliseconds. */
	readonly updatedAt: number;
	/** Plain-text snapshot of the containing verse or document context. */
	readonly previewText: string;
}

/** Bible locations have no version or content publisher in their identity. */
export interface BibleBookmarkTarget {
	readonly kind: 'bible';
	readonly bibleLocationRef: string;
}

/** Exact normalized-document Resource identity (not a content fingerprint). */
export interface NormalizedBookmarkDocumentReference {
	readonly publisher: string;
	readonly resourceId: string;
}

/** Snapshot-local address of one canonical normalized word. */
export interface NormalizedBookmarkWordAddress {
	readonly kind: 'word';
	readonly blockId: string;
	readonly contentIndex: number;
}

/** A normalized Bookmark belongs to exactly one publisher-owned Resource. */
export interface NormalizedDocumentBookmarkTarget {
	readonly kind: 'normalized-document';
	readonly document: NormalizedBookmarkDocumentReference;
	readonly address: NormalizedBookmarkWordAddress;
}

/** Extensible, discriminated Bookmark target contract (v1 supports two kinds). */
export type BookmarkTarget =
	| BibleBookmarkTarget
	| NormalizedDocumentBookmarkTarget;
