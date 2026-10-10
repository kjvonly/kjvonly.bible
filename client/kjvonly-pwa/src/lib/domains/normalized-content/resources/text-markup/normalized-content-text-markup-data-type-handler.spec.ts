import {
	describe,
	expect,
	it
} from 'vitest';

import {
	NormalizedContentTextMarkupDataTypeHandler
} from './normalized-content-text-markup-data-type-handler';

import {
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION
} from './normalized-content-text-markup-resource';

describe(
	'NormalizedContentTextMarkupDataTypeHandler',
	() => {
		it(
			'accepts the canonical markings payload',
			() => {
				const handler =
					new NormalizedContentTextMarkupDataTypeHandler();

				const value = {
					'paragraph-1': {
						'0': {
							class: [
								'bg-highlighta'
							]
						},
						'2': {
							class: [
								'text-highlightb',
								'underline'
							]
						}
					}
				};

				expect(
					handler.dataType
				).toBe(
					NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE
				);
				expect(
					handler.dataVersion
				).toBe(
					NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION
				);
				expect(
					handler.validate(
						value
					)
				).toEqual(
					value
				);
			}
		);

		it.each([
			'',
			'-1',
			'01',
			'1.0',
			'9007199254740992'
		])(
			'rejects non-canonical content index %s',
			(contentIndex) => {
				const handler =
					new NormalizedContentTextMarkupDataTypeHandler();

				expect(
					() =>
						handler.validate({
							'paragraph-1': {
								[contentIndex]: {
									class: []
								}
							}
						})
				).toThrow(
					`Invalid Normalized Content Text Markup content index: ${contentIndex}`
				);
			}
		);

		it(
			'rejects an empty block ID',
			() => {
				const handler =
					new NormalizedContentTextMarkupDataTypeHandler();

				expect(
					() =>
						handler.validate({
							'': {
								'0': {
									class: []
								}
							}
						})
				).toThrow(
					'Invalid Normalized Content Text Markup block ID.'
				);
			}
		);

		it(
			'rejects malformed marking values',
			() => {
				const handler =
					new NormalizedContentTextMarkupDataTypeHandler();

				expect(
					() =>
						handler.validate({
							'paragraph-1': {
								'0': {
									class:
										'bg-highlighta'
								}
							}
						})
				).toThrow();
			}
		);
	}
);
