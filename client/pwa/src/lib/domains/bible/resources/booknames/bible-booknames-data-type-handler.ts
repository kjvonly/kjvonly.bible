import type {
	BibleBooknamesContent
} from '../../models/bible-booknames.model';

import type {
	ResourceDataTypeHandler
} from '$lib/resource';

import {
	BibleBooknamesValidator
} from './bible-booknames-validator';

import {
	BIBLE_BOOKNAMES_DATA_TYPE,
	BIBLE_BOOKNAMES_DATA_VERSION
} from './bible-booknames-resource';

/** Validates the published Bible Booknames semantic payload. */
export class BibleBooknamesDataTypeHandler
	implements ResourceDataTypeHandler<BibleBooknamesContent> {

	readonly dataType =
		BIBLE_BOOKNAMES_DATA_TYPE;

	readonly dataVersion =
		BIBLE_BOOKNAMES_DATA_VERSION;

	validate(
		value: unknown
	): BibleBooknamesContent {
		return validateBibleBooknames(
			value
		);
	}
}


function validateBibleBooknames(
	value: unknown
): BibleBooknamesContent {
	return new BibleBooknamesValidator()
		.validate({
			key:
				'validated',
			value
		})
		.content;
}
