import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceInterpreter
} from '$lib/resource/interpretation/resource-interpreter';

import {
	parseResourceIdentifier
} from '$lib/resource/utils/resource-identifier';

import type {
	BibleSearchIndexCandidate
} from './bible-search-index-candidate';

export const BIBLE_SEARCH_RESOURCE_TYPE =
	'kjvonly/bible/search';

export class BibleSearchIndexInterpreter
	implements ResourceInterpreter<
		BibleSearchIndexCandidate
	> {

	readonly resourceType =
		BIBLE_SEARCH_RESOURCE_TYPE;

	interpret(
		resource:
			DecodedResourceContent
	): Iterable<
		BibleSearchIndexCandidate
	> {
		if (
			resource.resourceType !==
			this.resourceType
		) {
			throw new Error(
				`Invalid Bible Search Index Resource Type: ${resource.resourceType}`
			);
		}

		const identifier =
			parseResourceIdentifier(
				resource.resourceId
			);

		if (
			identifier.resourceType !==
			this.resourceType
		) {
			throw new Error(
				`Invalid Bible Search Index Resource Identifier: ${resource.resourceId}`
			);
		}

		if (
			identifier.path.length ===
			0
		) {
			throw new Error(
				'Bible Search Index Resource root is not supported.'
			);
		}

		if (
			identifier.path.length !==
			1
		) {
			throw new Error(
				`Invalid Bible Search Index Resource path: ${resource.resourceId}`
			);
		}

		const [
			version
		] =
			identifier.path;

		return [
			{
				version,

				value:
					resource.value
			}
		];
	}
}
