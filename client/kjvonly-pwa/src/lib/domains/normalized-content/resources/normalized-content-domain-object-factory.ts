import type {
	ResourceDomainObjectCandidate,
	ResourceDomainObjectFactory,
	ResourceDomainObjectFactoryContext
} from '$lib/resource';

import {
	NORMALIZED_DOCUMENT_OBJECT_TYPE,
	createNormalizedDocumentId
} from '../models/normalized-document-id';

import {
	NORMALIZED_CONTENT_RESOURCE_TYPE,
	NORMALIZED_DOCUMENT_DATA_TYPE,
	NORMALIZED_DOCUMENT_DATA_VERSION
} from './normalized-content-resource-contract';

/**
 * Gives standalone normalized-document Resources their Domain identity.
 * Semantic validation is performed before this factory is invoked.
 */
export class NormalizedContentDomainObjectFactory
	implements ResourceDomainObjectFactory {

	readonly resourceType =
		NORMALIZED_CONTENT_RESOURCE_TYPE;

	create(
		resource:
			ResourceDomainObjectFactoryContext,

		value:
			unknown
	): readonly ResourceDomainObjectCandidate[] {
		return [
			{
				objectType:
					NORMALIZED_DOCUMENT_OBJECT_TYPE,


				objectId:
					createNormalizedDocumentId(
						resource.publisher,
						resource.resourceId
					),

				dataType:
					NORMALIZED_DOCUMENT_DATA_TYPE,

				dataVersion:
					NORMALIZED_DOCUMENT_DATA_VERSION,

				value
			}
		];
	}
}
