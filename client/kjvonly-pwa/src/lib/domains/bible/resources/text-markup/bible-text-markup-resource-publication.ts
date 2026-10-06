import type {
	ResourcePublication
} from '$lib/resource';

import type {
	BibleTextMarkup
} from '../../models/bible-text-markup.model';

import {
	BIBLE_TEXT_MARKUP_DATA_TYPE,
	BIBLE_TEXT_MARKUP_DATA_VERSION,
	BIBLE_TEXT_MARKUP_RESOURCE_TYPE,
	createBibleTextMarkupResourceId
} from './bible-text-markup-resource';

export class BibleTextMarkupResourcePublication {

	create(
		textMarkup:
			BibleTextMarkup
	): ResourcePublication {
		const {
			publisher,
			name,
			chapterRef
		} =
			parseBibleTextMarkupId(
				textMarkup.id
			);

		if (
			textMarkup.chapterRef !==
			chapterRef
		) {
			throw new Error(
				`Bible Text Markup chapter does not match Domain identity: ${textMarkup.id}`
			);
		}

		return {
			type:
				'resource',

			publisher,

			resourceType:
				BIBLE_TEXT_MARKUP_RESOURCE_TYPE,

			dataType:
				BIBLE_TEXT_MARKUP_DATA_TYPE,

			dataVersion:
				BIBLE_TEXT_MARKUP_DATA_VERSION,

			resourceId:
				createBibleTextMarkupResourceId(
					name,
					chapterRef
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

interface BibleTextMarkupIdParts {
	readonly publisher:
		string;

	readonly name:
		string;

	readonly chapterRef:
		string;
}

function parseBibleTextMarkupId(
	id:
		string
): BibleTextMarkupIdParts {
	const parts =
		id.split('/');

	if (
		parts.length !== 3 ||
		parts.some(
			(part) =>
				part.length === 0
		)
	) {
		throw new Error(
			`Invalid Bible Text Markup id: ${id}`
		);
	}

	const [
		publisher,
		name,
		chapterRef
	] = parts;

	return {
		publisher,
		name,
		chapterRef
	};
}
