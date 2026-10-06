import {
	type PublishedResourceReference,
	type ResourceLoader
} from '$lib/resource';

import type {
	Chapter
} from '../models/bible.model';

import type {
	ChapterStore
} from '../persistence/chapter-store';


import {
	parseBibleChapterResourceId
} from '../resources/chapters/bible-chapter-resource';

import {
	createBibleVersionId,
	createChapterId
} from '../utils/bible-identity';

import type {
	BibleLocationReferenceService
} from './bibleLocationReference.service';

export class ChapterService {

	constructor(
		private readonly chapters:
			Pick<
				ChapterStore,
				'get'
			>,

		private readonly resourceLoader:
			Pick<
				ResourceLoader<string>,
				'load'
			>,

		private readonly bibleLocationReferenceService:
			Pick<
				BibleLocationReferenceService,
				'extractBookIDChapter'
			>
	) {}

	async get(
		source:
			PublishedResourceReference,

		bibleLocationRef:
			string
	): Promise<Chapter> {

		const {
			version
		} =
			parseChapterSource(
				source
			);

		const chapterRef =
			this.bibleLocationReferenceService
				.extractBookIDChapter(
					bibleLocationRef
				);

		const bibleVersionId =
			createBibleVersionId(
				source.publisher,
				version
			);

		const chapterId =
			createChapterId(
				bibleVersionId,
				chapterRef
			);

		const existing =
			await this.chapters.get(
				chapterId
			);

		if (
			existing !==
			undefined
		) {
			return existing;
		}

		const found =
			await this.resourceLoader.load(
				source,
				chapterRef
			);

		if (!found) {
			throw new Error(
				`Bible Chapter Resource not found: ${source.publisher}/${source.resourceId}/${chapterRef}`
			);
		}

		const installed =
			await this.chapters.get(
				chapterId
			);

		if (
			installed ===
			undefined
		) {
			throw new Error(
				`Bible Chapter was not installed: ${chapterId}`
			);
		}

		return installed;
	}
}

function parseChapterSource(
	source:
		PublishedResourceReference
): {
	readonly version:
		string;
} {
	const identity =
		parseBibleChapterResourceId(
			source.resourceId
		);

	if (
		identity.chapterRef !==
			undefined
	) {
		throw new Error(
			`Invalid Bible Chapter Resource source: ${source.resourceId}`
		);
	}

	return {
		version:
			identity.bibleId
	};
}
