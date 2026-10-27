import {
	describe,
	expect,
	it
} from 'vitest';

import {
	BibleBooknamesDataTypeHandler
} from './bible-booknames-data-type-handler';

import {
	BIBLE_BOOKNAMES_DATA_TYPE,
	BIBLE_BOOKNAMES_DATA_VERSION
} from './bible-booknames-resource';

describe(
	'BibleBooknamesDataTypeHandler',
	() => {
		it(
			'validate the published Resource contract',
			() => {
				const handler =
					new BibleBooknamesDataTypeHandler();

				expect(
					handler.dataType
				).toBe(
					BIBLE_BOOKNAMES_DATA_TYPE
				);

				expect(
					handler.dataVersion
				).toBe(
					BIBLE_BOOKNAMES_DATA_VERSION
				);

				expect(
					handler.validate(
						createContent()
					)
				).toEqual(
					createContent()
				);
			}
		);

	}
);

function createContent() {
	return {
		booknamesById: {
			'1':
				'Genesis'
		},

		booknamesByName: {
			Genesis:
				1
		},

		shortNames: {
			'1':
				'Gen'
		},

		maxChapterById: {
			'1':
				1
		},

		bookchapterversecountById: {
			'1': {
				'1':
					31
			}
		}
	};
}
