import type {
	ResourcePublication
} from '$lib/resource';

import type {
	NormalizedContentTextMarkup
} from '../../models/normalized-content-text-markup.model';

import {
	parseNormalizedContentTextMarkupId
} from '../../models/normalized-content-text-markup.model';

import {
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION,
	NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_TYPE,
	createNormalizedContentTextMarkupResourceId
} from './normalized-content-text-markup-resource';

/** Maps accepted user-owned Text Markup into an outbound Resource payload. */
export class NormalizedContentTextMarkupResourcePublication {

	/**
	 * @param textMarkup Accepted markup whose ID encodes its owner and target.
	 * @returns Resource publication containing only the markings as its value.
	 * @throws When document identity conflicts with the Domain Object ID.
	 */
	create(
		textMarkup:
			NormalizedContentTextMarkup
	): ResourcePublication {
		const identity =
			parseNormalizedContentTextMarkupId(
				textMarkup.id
			);

		assertMatchingDocumentReference(
			textMarkup,
			identity.document
		);

		return {
			type:
				'resource',

			publisher:
				identity.publisher,

			resourceType:
				NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_TYPE,

			dataType:
				NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,

			dataVersion:
				NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION,

			resourceId:
				createNormalizedContentTextMarkupResourceId(
					identity.document.publisher,
					identity.document.resourceId,
					identity.document.modifiedAt
				),

			representation:
				'content',

			mediaType:
				'application/json+gzip+hex',

			value:
				textMarkup.markings
		};
	}
}

function assertMatchingDocumentReference(
	textMarkup: NormalizedContentTextMarkup,
	identityDocument: NormalizedContentTextMarkup['document']
): void {
	const document =
		textMarkup.document;

	if (
		document.publisher !==
			identityDocument.publisher ||
		document.resourceId !==
			identityDocument.resourceId ||
		document.modifiedAt !==
			identityDocument.modifiedAt
	) {
		throw new Error(
			`Normalized Content Text Markup document does not match Domain identity: ${textMarkup.id}`
		);
	}
}
