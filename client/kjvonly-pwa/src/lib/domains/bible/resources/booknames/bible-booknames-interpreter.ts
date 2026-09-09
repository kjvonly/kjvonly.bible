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
	BibleBooknamesCandidate
} from './bible-booknames-candidate';

export const BIBLE_BOOKNAMES_RESOURCE_TYPE =
	'kjvonly/bible/booknames';

export class BibleBooknamesInterpreter
	implements ResourceInterpreter<
		BibleBooknamesCandidate
	> {

	readonly resourceType =
		BIBLE_BOOKNAMES_RESOURCE_TYPE;

	interpret(
		resource:
			DecodedResourceContent
	): Iterable<
		BibleBooknamesCandidate
	> {
		if (
			resource.resourceType !==
			this.resourceType
		) {
			throw new Error(
				`Invalid Bible Booknames Resource Type: ${resource.resourceType}`
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
				`Invalid Bible Booknames Resource Identifier: ${resource.resourceId}`
			);
		}

		if (
			identifier.path.length ===
			1
		) {
			const [
				key
			] =
				identifier.path;

			return [
				{
					key,

					value:
						resource.value
				}
			];
		}

		if (
			identifier.path.length ===
			0
		) {
			throw new Error(
				'Bible Booknames Resource root is not supported.'
			);
		}

		throw new Error(
			`Invalid Bible Booknames Resource path: ${resource.resourceId}`
		);
	}
}
