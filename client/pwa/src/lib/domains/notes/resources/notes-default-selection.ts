import type {
	PublishedResourceReference
} from '$lib/resource';

import {
	createNotesResourceId
} from './notes-resource-id';

export const DEFAULT_NOTES_RESOURCE_NAME =
	'default';

export function createDefaultNotesSelection(
	publisher: string
): PublishedResourceReference {
	return {
		publisher,

		resourceId:
			createNotesResourceId(
				DEFAULT_NOTES_RESOURCE_NAME
			)
	};
}
