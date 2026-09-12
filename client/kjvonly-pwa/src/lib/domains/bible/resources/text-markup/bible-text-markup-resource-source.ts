import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import {
	parseResourceIdentifier
} from '$lib/resource/utils/resource-identifier';

import {
	BIBLE_TEXT_MARKUP_RESOURCE_TYPE
} from './bible-text-markup-interpreter';

export interface BibleTextMarkupResourceSource {
	readonly name:
		string;
}

export function parseBibleTextMarkupResourceSource(
	source:
		PublishedResourceReference
): BibleTextMarkupResourceSource {
	const identifier =
		parseResourceIdentifier(
			source.resourceId
		);

	if (
		identifier.resourceType !==
		BIBLE_TEXT_MARKUP_RESOURCE_TYPE
	) {
		throw new Error(
			`Invalid Bible Text Markup Resource Type: ${identifier.resourceType}`
		);
	}

	if (
		identifier.path.length !==
		1
	) {
		throw new Error(
			`Invalid Bible Text Markup Resource source: ${source.resourceId}`
		);
	}

	return {
		name:
			identifier.path[0]
	};
}
