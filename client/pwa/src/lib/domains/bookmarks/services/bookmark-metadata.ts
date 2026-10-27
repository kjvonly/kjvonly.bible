/** Keep complete Bible verses while bounding Resource payloads and list rendering. */
export const BOOKMARK_PREVIEW_MAX_LENGTH = 4096;

export interface BookmarkDisplayMetadata {
	readonly updatedAt: number;
	readonly previewText: string;
}

/** Reject malformed Resource metadata without transforming the saved snapshot. */
export function parseBookmarkDisplayMetadata(value: BookmarkDisplayMetadata): BookmarkDisplayMetadata {
	if (!Number.isSafeInteger(value.updatedAt) || value.updatedAt <= 0) {
		throw new Error('Invalid Bookmark updatedAt');
	}
	if (
		typeof value.previewText !== 'string' ||
		value.previewText.length > BOOKMARK_PREVIEW_MAX_LENGTH ||
		value.previewText.trim() !== value.previewText ||
		/[\u0000-\u001f\u007f]/.test(value.previewText) ||
		/<[^>]+>/.test(value.previewText)
	) {
		throw new Error('Invalid Bookmark previewText');
	}
	// Empty text remains valid for producers without a Reader preview,
	// including deferred normalized-document integration.
	return { updatedAt: value.updatedAt, previewText: value.previewText };
}
