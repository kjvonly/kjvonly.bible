import type {
	Chapter
} from '$lib/domains/bible/models/bible.model';

import type {
	ResourcePublication
} from '$lib/resource';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE
} from './bible-chapter-interpreter';

export class BibleChapterResourcePublication {

	create(
		chapter: Chapter
	): ResourcePublication {
		const {
			publisher,
			version,
			chapterRef
		} = parseBibleChapterId(
			chapter.id
		);

		return {
			type:
				'resource',

			publisher,

			resourceType:
				BIBLE_CHAPTER_RESOURCE_TYPE,

			resourceId:
				`${BIBLE_CHAPTER_RESOURCE_TYPE}/${version}/${chapterRef}`,

			representation:
				'content',

			mediaType:
				'application/json+gzip+hex',

			value: {
				number:
					chapter.number,

				bookName:
					chapter.bookName,

				verses:
					chapter.verses,

				verseMap:
					chapter.verseMap,

				footnotes:
					chapter.footnotes
			}
		};
	}
}

interface BibleChapterIdParts {
	readonly publisher:
		string;

	readonly version:
		string;

	readonly chapterRef:
		string;
}

function parseBibleChapterId(
	id: string
): BibleChapterIdParts {
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
			`Invalid Bible Chapter id: ${id}`
		);
	}

	const [
		publisher,
		version,
		chapterRef
	] = parts;

	return {
		publisher,
		version,
		chapterRef
	};
}
