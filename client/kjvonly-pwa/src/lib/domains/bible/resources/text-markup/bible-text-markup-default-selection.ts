import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import {
	parseResourceIdentifier
} from '$lib/resource/utils/resource-identifier';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';

import {
	BIBLE_TEXT_MARKUP_RESOURCE_TYPE
} from './bible-text-markup-interpreter';

export function createDefaultBibleTextMarkupSelection(
	publisher: string,
	chapterSource:
		PublishedResourceReference
): PublishedResourceReference {
	const identifier =
		parseResourceIdentifier(
			chapterSource.resourceId
		);

	if (
		identifier.resourceType !==
		BIBLE_CHAPTER_RESOURCE_TYPE
	) {
		throw new Error(
			`Invalid Bible Chapter Resource Type: ${identifier.resourceType}`
		);
	}

	if (
		identifier.path.length !==
		1
	) {
		throw new Error(
			`Invalid Bible Chapter Resource source: ${chapterSource.resourceId}`
		);
	}

	return {
		publisher,

		resourceId:
			`${BIBLE_TEXT_MARKUP_RESOURCE_TYPE}/${identifier.path[0]}`
	};
}
