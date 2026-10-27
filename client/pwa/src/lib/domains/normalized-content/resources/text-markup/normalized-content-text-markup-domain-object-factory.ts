import type {
	ResourceDomainObjectCandidate,
	ResourceDomainObjectFactory,
	ResourceDomainObjectFactoryContext
} from '$lib/resource';

import {
	NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
	createNormalizedContentTextMarkupId,
	type NormalizedContentTextMarkup,
	type NormalizedContentTextMarkupMap
} from '../../models/normalized-content-text-markup.model';

import {
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION,
	NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_TYPE,
	parseNormalizedContentTextMarkupResourceId
} from './normalized-content-text-markup-resource';

/**
 * Gives a validated Text Markup payload its user-owned Domain identity and
 * exact target-document snapshot reference.
 */
export class NormalizedContentTextMarkupDomainObjectFactory
	implements ResourceDomainObjectFactory {

	readonly resourceType =
		NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_TYPE;

	create(
		resource:
			ResourceDomainObjectFactoryContext,

		value: unknown
	): readonly ResourceDomainObjectCandidate[] {
		const document =
			parseNormalizedContentTextMarkupResourceId(
				resource.resourceId
			);

		const id =
			createNormalizedContentTextMarkupId(
				resource.publisher,
				document.documentPublisher,
				document.documentResourceId,
				document.documentModifiedAt
			);

		const textMarkup:
			NormalizedContentTextMarkup = {
				id,
				document: {
					publisher:
						document.documentPublisher,
					resourceId:
						document.documentResourceId,
					modifiedAt:
						document.documentModifiedAt
				},
				markings:
					value as NormalizedContentTextMarkupMap
			};

		return [
			{
				objectType:
					NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,

				objectId:
					id,

				dataType:
					NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,

				dataVersion:
					NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION,

				value:
					textMarkup
			}
		];
	}
}
