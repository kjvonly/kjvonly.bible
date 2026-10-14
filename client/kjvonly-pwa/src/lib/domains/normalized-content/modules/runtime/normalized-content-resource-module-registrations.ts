import {
	Modules,
	type ResourceModuleRegistration
} from '$lib/application';

import {
	NORMALIZED_CONTENT_VIEWS
} from '../../models/normalized-content-navigation.model';

import {
	NORMALIZED_CONTENT_RESOURCE_TYPE,
	NORMALIZED_DOCUMENT_DATA_TYPE,
	NORMALIZED_DOCUMENT_DATA_VERSION
} from '../../resources/normalized-content-resource-contract';

/**
 * Opens standalone Normalized Content Resources with the existing document
 * Reader. Other Domains may reuse the normalized-document data contract but
 * must not be routed to this Domain's standalone document store by default.
 */
export const normalizedContentResourceModuleRegistrations:
	readonly ResourceModuleRegistration[] = [
		{
			module: Modules.NORMALIZED_CONTENT,
			view: NORMALIZED_CONTENT_VIEWS.READER,
			match: {
				resourceType: NORMALIZED_CONTENT_RESOURCE_TYPE
			},
			supports: (descriptor) =>
				descriptor.metadata.dataType ===
					NORMALIZED_DOCUMENT_DATA_TYPE &&
				descriptor.metadata.dataVersion ===
					NORMALIZED_DOCUMENT_DATA_VERSION,
			createState: (descriptor, context) => ({
				descriptor,
				...(context?.fileName ? { fileName: context.fileName } : {}),
				...(context?.sequence ? {
					sequence: context.sequence.items.map((item) => ({
						descriptor: item.descriptor,
						fileName: item.fileName
					})),
					sequenceIndex: context.sequence.index
				} : {})
			})
		}
	];
