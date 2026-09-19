import type {
	BibleSearchIndex
} from '$lib/domains/bible/models/bible-search-index.model';

import type {
	ResourcePublication
} from '$lib/resource';

import {
	BIBLE_SEARCH_RESOURCE_TYPE
} from './bible-search-index-interpreter';

export class BibleSearchIndexResourcePublication {

	create(
		searchIndex: BibleSearchIndex
	): ResourcePublication {
		const {
			publisher,
			version
		} = parseBibleSearchIndexId(
			searchIndex.id
		);

		if (
			searchIndex.version !==
				version
		) {
			throw new Error(
				`Bible Search Index version does not match Domain identity: ${searchIndex.id}`
			);
		}

		return {
			type:
				'resource',

			publisher,

			resourceType:
				BIBLE_SEARCH_RESOURCE_TYPE,

			resourceId:
				`${BIBLE_SEARCH_RESOURCE_TYPE}/${version}`,

			representation:
				'content',

			mediaType:
				'application/json+gzip+hex',

			value:
				searchIndex.chunks
		};
	}
}

function parseBibleSearchIndexId(
	id: string
): {
	readonly publisher: string;
	readonly version: string;
} {
	const parts =
		id.split('/');

	if (
		parts.length !== 2 ||
		parts.some(
			(part) =>
				part.length === 0
		)
	) {
		throw new Error(
			`Invalid Bible Search Index id: ${id}`
		);
	}

	const [
		publisher,
		version
	] = parts;

	return {
		publisher,
		version
	};
}
