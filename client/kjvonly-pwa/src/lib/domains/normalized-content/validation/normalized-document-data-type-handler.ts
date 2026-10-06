import type {
	ResourceDataTypeHandler
} from '$lib/resource';

import type {
	NormalizedDocument
} from '../models/normalized-document.model';

import {
	NORMALIZED_DOCUMENT_DATA_TYPE,
	NORMALIZED_DOCUMENT_DATA_VERSION
} from '../resources/normalized-content-resource-contract';

import type {
	NormalizedDocumentValidator
} from './normalized-document-validator';

/** Semantic Resource datatype capability for NormalizedDocument v1. */
export class NormalizedDocumentDataTypeHandler implements ResourceDataTypeHandler<NormalizedDocument> {
	readonly dataType =
		NORMALIZED_DOCUMENT_DATA_TYPE;

	readonly dataVersion =
		NORMALIZED_DOCUMENT_DATA_VERSION;

	constructor(
		private readonly validator:
			Pick<
				NormalizedDocumentValidator,
				'validate'
			>
	) {}

	validate(
		value: unknown
	): NormalizedDocument {
		return this.validator.validate(
			value
		);
	}
}
