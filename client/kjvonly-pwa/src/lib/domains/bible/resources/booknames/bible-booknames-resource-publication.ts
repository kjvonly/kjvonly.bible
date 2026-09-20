import type {
	BibleBooknames
} from '../../models/bible-booknames.model';

import type {
	ResourcePublication
} from '$lib/resource';

import {
	BIBLE_BOOKNAMES_RESOURCE_TYPE
} from './bible-booknames-interpreter';

export class BibleBooknamesResourcePublication {

	create(
		booknames: BibleBooknames
	): ResourcePublication {
		const {
			publisher,
			key
		} = parseBibleBooknamesId(
			booknames.id
		);

		return {
			type:
				'resource',

			publisher,

			resourceType:
				BIBLE_BOOKNAMES_RESOURCE_TYPE,

			resourceId:
				`${BIBLE_BOOKNAMES_RESOURCE_TYPE}/${key}`,

			representation:
				'content',

			mediaType:
				'application/json+gzip+hex',

			value: {
				booknamesById:
					booknames.booknamesById,

				booknamesByName:
					booknames.booknamesByName,

				shortNames:
					booknames.shortNames,

				maxChapterById:
					booknames.maxChapterById,

				bookchapterversecountById:
					booknames.bookchapterversecountById
			}
		};
	}
}

function parseBibleBooknamesId(
	id: string
): {
	readonly publisher: string;
	readonly key: string;
} {
	const parts =
		id.split('/');

	if (
		parts.length !== 2 ||
		parts.some(
			(part) =>
				part.length === 0
		)
	) {
		throw new Error(
			`Invalid Bible Booknames id: ${id}`
		);
	}

	const [
		publisher,
		key
	] = parts;

	return {
		publisher,
		key
	};
}
