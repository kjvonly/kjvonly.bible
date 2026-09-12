import type {
	ResourcePublication
} from '$lib/resource/publication/resource-publication';

import type {
	BibleTextMarkup
} from '$lib/domains/bible/models/bible-text-markup.model';

import {
	BIBLE_TEXT_MARKUP_RESOURCE_TYPE
} from './bible-text-markup-interpreter';

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
			publisher,

			resourceType:
				BIBLE_TEXT_MARKUP_RESOURCE_TYPE,

			resourceId:
				`${BIBLE_TEXT_MARKUP_RESOURCE_TYPE}/${name}/${chapterRef}`,

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
