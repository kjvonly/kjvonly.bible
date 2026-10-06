import type {
	PublishedResourceReference
} from '$lib/resource';


import {
	parseBibleChapterResourceId
} from '../chapters/bible-chapter-resource';

import {
	createBibleTextMarkupResourceId
} from './bible-text-markup-resource';

export function createDefaultBibleTextMarkupSelection(
	publisher: string,
	chapterSource:
		PublishedResourceReference
): PublishedResourceReference {
	const identity =
		parseBibleChapterResourceId(
			chapterSource.resourceId
		);

	if (
		identity.chapterRef !==
			undefined
	) {
		throw new Error(
			`Invalid Bible Chapter Resource source: ${chapterSource.resourceId}`
		);
	}

	return {
		publisher,

		resourceId:
			createBibleTextMarkupResourceId(
				identity.bibleId
			)
	};
}
