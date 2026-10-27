import type {
	BibleBooknames,
	BibleBooknamesContent
} from '../../models/bible-booknames.model';

import {
	createBibleBooknamesId
} from '../../models/bible-booknames.model';

import {
	BIBLE_BOOKNAMES_OBJECT_TYPE
} from '../../persistence/bible-booknames-store';

import {
	type ResourceDomainObjectCandidate,
	type ResourceDomainObjectFactory,
	type ResourceDomainObjectFactoryContext
} from '$lib/resource';

import {
	BIBLE_BOOKNAMES_DATA_TYPE,
	BIBLE_BOOKNAMES_DATA_VERSION,
	BIBLE_BOOKNAMES_RESOURCE_TYPE,
	parseBibleBooknamesResourceId
} from './bible-booknames-resource';

/**
 * Gives validated Bible Booknames content its canonical Bible Domain identity.
 *
 * The datatype handler owns semantic payload validation. This factory owns the
 * Resource-path key and the persisted `bible/booknames` object identity.
 */
export class BibleBooknamesDomainObjectFactory
	implements ResourceDomainObjectFactory {

	readonly resourceType =
		BIBLE_BOOKNAMES_RESOURCE_TYPE;

	create(
		resource:
			ResourceDomainObjectFactoryContext,

		value: unknown
	): readonly ResourceDomainObjectCandidate[] {
		const key =
			parseBibleBooknamesResourceId(
				resource.resourceId
			);

		const id =
			createBibleBooknamesId(
				resource.publisher,
				key
			);

		const booknames:
			BibleBooknames = {
				id,
				...value as BibleBooknamesContent
			};

		return [
			{
				objectType:
					BIBLE_BOOKNAMES_OBJECT_TYPE,


				objectId:
					id,

				dataType:
					BIBLE_BOOKNAMES_DATA_TYPE,

				dataVersion:
					BIBLE_BOOKNAMES_DATA_VERSION,

				value:
					booknames
			}
		];
	}
}
