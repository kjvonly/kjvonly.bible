import {
	describe,
	expect,
	it
} from 'vitest';

import {
	BibleSearchIndexDataTypeHandler
} from './bible-search-index-data-type-handler';

import {
	BIBLE_SEARCH_INDEX_DATA_TYPE,
	BIBLE_SEARCH_INDEX_DATA_VERSION
} from './bible-search-index-resource';

describe(
	'BibleSearchIndexDataTypeHandler',
	() => {
		it(
			'exposes the published Bible Search Index semantic contract',
			() => {
				const handler =
					new BibleSearchIndexDataTypeHandler();

				expect(
					handler.dataType
				).toBe(
					BIBLE_SEARCH_INDEX_DATA_TYPE
				);

				expect(
					handler.dataVersion
				).toBe(
					BIBLE_SEARCH_INDEX_DATA_VERSION
				);
			}
		);

		it(
			'validates and preserves the FlexSearch chunk payload',
			() => {
				const chunks =
					createChunks();

				expect(
					new BibleSearchIndexDataTypeHandler()
						.validate(
							chunks
						)
				).toEqual(
					chunks
				);
			}
		);

		it(
			'rejects an incomplete FlexSearch export',
			() => {
				const {
					ctx: _,
					...incomplete
				} = createChunks();

				expect(
					() =>
						new BibleSearchIndexDataTypeHandler()
							.validate(
								incomplete
							)
				).toThrow(
					'Bible Search Index is missing required FlexSearch chunk: ctx'
				);
			}
		);
	}
);

function createChunks() {
	return {
		reg:
			'{}',

		cfg:
			'{"doc":0,"opt":1}',

		map:
			'[]',

		ctx:
			'[]'
	};
}
