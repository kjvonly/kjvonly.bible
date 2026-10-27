import type {
	PublishedResourceReference
} from '$lib/resource';


import {
	parseBibleTextMarkupResourceId
} from './bible-text-markup-resource';

export interface BibleTextMarkupResourceSource {
	readonly name:
		string;
}

export function parseBibleTextMarkupResourceSource(
	source:
		PublishedResourceReference
): BibleTextMarkupResourceSource {
	const identity =
		parseBibleTextMarkupResourceId(
			source.resourceId
		);

	if (
		identity.chapterRef !==
			undefined
	) {
		throw new Error(
			`Invalid Bible Text Markup Resource source: ${source.resourceId}`
		);
	}

	return {
		name:
			identity.name
	};
}
