import type {
	Chapter
} from '../../models/bible.model';

import type {
	ResourcePublication
} from '$lib/resource';

import {
	BIBLE_CHAPTER_DATA_TYPE,
	BIBLE_CHAPTER_DATA_VERSION,
	BIBLE_CHAPTER_RESOURCE_TYPE,
	createBibleChapterResourceId,
	BIBLE_CHAPTER_VERSION_METADATA_KEY
} from './bible-chapter-resource';

export class BibleChapterResourcePublication {

	create(
		chapter: Chapter
	): ResourcePublication {
		const {
			publisher,
			bibleId,
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

			dataType:
				BIBLE_CHAPTER_DATA_TYPE,

			dataVersion:
				BIBLE_CHAPTER_DATA_VERSION,

			resourceId:
				createBibleChapterResourceId(
					bibleId,
					chapterRef
				),

			representation:
				'content',

			mediaType:
				'application/json+gzip+hex',

			/*
			 * A Chapter Domain object intentionally does not duplicate its semantic
			 * Bible version label. Archive import prefers metadata preserved on the
			 * ResourceInstallation. This identity-derived value is only a backward-
			 * compatible fallback for older objects that predate metadata provenance.
			 */
			metadata: {
				[BIBLE_CHAPTER_VERSION_METADATA_KEY]:
					bibleId
			},

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

	readonly bibleId:
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
		bibleId,
		chapterRef
	] = parts;

	return {
		publisher,
		bibleId,
		chapterRef
	};
}
