import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	Chapter
} from '$lib/domains/bible/models/bible.model';

import type {
	ChapterStore
} from '$lib/domains/bible/persistence/chapter-store';

import type {
	ResourceLoader
} from '$lib/resource/loading/resource-loader';

import {
	parseResourceIdentifier
} from '$lib/resource/utils/resource-identifier';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';

import {
	createBibleVersionId,
	createChapterId
} from '$lib/domains/bible/utils/bible-identity';

import {
	bibleLocationReferenceService
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
			bibleLocationReferenceService
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

	const identifier =
		parseResourceIdentifier(
			source.resourceId
		);

	if (
		identifier.resourceType !==
		BIBLE_CHAPTER_RESOURCE_TYPE
	) {
		throw new Error(
			`Invalid Bible Chapter Resource Type: ${identifier.resourceType}`
		);
	}

	if (
		identifier.path.length !==
		1
	) {
		throw new Error(
			`Invalid Bible Chapter Resource source: ${source.resourceId}`
		);
	}

	return {
		version:
			identifier.path[0]
	};
}