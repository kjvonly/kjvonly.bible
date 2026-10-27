/**
 * Stable NotesService result channel used when the accepted Notes collection
 * changes. Consumers subscribe to this id to refresh derived Notes views after
 * Notes are initialized, added, or removed.
 */
export const NOTES_COLLECTION_CHANGED =
	'notes:collection-changed' as const;
