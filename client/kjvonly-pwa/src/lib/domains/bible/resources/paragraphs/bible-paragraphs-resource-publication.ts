import type {
	BibleParagraphs
} from '$lib/domains/bible/models/bible-paragraphs.model';

import type {
	ResourcePublication
} from '$lib/resource';

import {
	BIBLE_PARAGRAPHS_RESOURCE_TYPE
} from './bible-paragraphs-interpreter';

export class BibleParagraphsResourcePublication {

	create(
		paragraphs: BibleParagraphs
	): ResourcePublication {
		const {
			publisher,
			source,
			chapterRef
		} = parseBibleParagraphsId(
			paragraphs.id
		);

		if (
			paragraphs.chapterRef !==
				chapterRef
		) {
			throw new Error(
				`Bible Paragraphs chapter does not match Domain identity: ${paragraphs.id}`
			);
		}

		return {
			type:
				'resource',

			publisher,

			resourceType:
				BIBLE_PARAGRAPHS_RESOURCE_TYPE,

			resourceId:
				`${BIBLE_PARAGRAPHS_RESOURCE_TYPE}/${source}/${chapterRef}`,

			representation:
				'content',

			mediaType:
				'application/json+gzip+hex',

			value:
				paragraphs.paragraphs
		};
	}
}

function parseBibleParagraphsId(
	id: string
): {
	readonly publisher: string;
	readonly source: string;
	readonly chapterRef: string;
} {
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
			`Invalid Bible Paragraphs id: ${id}`
		);
	}

	const [
		publisher,
		source,
		chapterRef
	] = parts;

	return {
		publisher,
		source,
		chapterRef
	};
}
