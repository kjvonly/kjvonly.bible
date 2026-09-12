import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import {
	NOTES_RESOURCE_TYPE
} from './note-interpreter';

export const DEFAULT_NOTES_RESOURCE_NAME =
	'default';

export function createDefaultNotesSelection(
	publisher: string
): PublishedResourceReference {
	return {
		publisher,

		resourceId:
			`${NOTES_RESOURCE_TYPE}/${DEFAULT_NOTES_RESOURCE_NAME}`
	};
}
