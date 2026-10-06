import type {
	PublishedResourceReference
} from '$lib/resource';

import type {
	BibleVersion
} from '../../../models/bible-version.model';

import {
	createBibleChapterResourceId
} from '../../../resources/chapters/bible-chapter-resource';

/** Returns the Bible Chapter Resource represented by one Bible version. */
export function createBibleChapterResourceReference(
	version: BibleVersion
): PublishedResourceReference {
	return {
		publisher: version.publisher,
		resourceId:
			createBibleChapterResourceId(
				version.version
			)
	};
}
