import type {
	PublishedResourceReference
} from '$lib/resource';

import type {
	BibleVersion
} from '../../../models/bible-version.model';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE
} from '../../../resources/chapters/bible-chapter-interpreter';

/** Returns the Bible Chapter Resource represented by one Bible version. */
export function createBibleChapterResourceReference(
	version: BibleVersion
): PublishedResourceReference {
	return {
		publisher: version.publisher,
		resourceId:
			`${BIBLE_CHAPTER_RESOURCE_TYPE}/${version.version}`
	};
}
