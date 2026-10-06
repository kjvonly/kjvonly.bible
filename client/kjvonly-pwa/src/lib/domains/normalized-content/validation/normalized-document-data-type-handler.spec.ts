import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	NORMALIZED_DOCUMENT_DATA_TYPE,
	NORMALIZED_DOCUMENT_DATA_VERSION
} from '../resources/normalized-content-resource-contract';

import {
	NormalizedDocumentDataTypeHandler
} from './normalized-document-data-type-handler';

import type {
	NormalizedDocumentValidator
} from './normalized-document-validator';

describe(
	'NormalizedDocumentDataTypeHandler',
	() => {
		it(
			'declares the NormalizedDocument semantic contract',
			() => {
				const validator = {
					validate:
						vi.fn()
				} satisfies Pick<
					NormalizedDocumentValidator,
					'validate'
				>;

				const handler =
					new NormalizedDocumentDataTypeHandler(
						validator
					);

				expect(
					handler.dataType
				).toBe(
					NORMALIZED_DOCUMENT_DATA_TYPE
				);

				expect(
					handler.dataVersion
				).toBe(
					NORMALIZED_DOCUMENT_DATA_VERSION
				);
			}
		);

		it(
			'delegates semantic validation to its injected validator',
			() => {
				const document = {
					blocks: []
				};

				const validator = {
					validate:
						vi.fn(
							() => document
						)
				} satisfies Pick<
					NormalizedDocumentValidator,
					'validate'
				>;

				const handler =
					new NormalizedDocumentDataTypeHandler(
						validator
					);

				const candidate = {
					anything:
						true
				};

				expect(
					handler.validate(
						candidate
					)
				).toBe(
					document
				);

				expect(
					validator.validate
				).toHaveBeenCalledWith(
					candidate
				);
			}
		);
	}
);
