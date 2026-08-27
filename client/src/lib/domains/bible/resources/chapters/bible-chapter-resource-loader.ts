import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	ChapterResourceLoader
} from '$lib/domains/bible/services/chapter-resource-loader';

import type {
	BibleChapterResourceService
} from './bible-chapter-resource-service';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE
} from './bible-chapter-interpreter';

export class BibleChapterResourceLoader
	implements ChapterResourceLoader {

	constructor(
		private readonly resources:
			Pick<
				BibleChapterResourceService,
				'install'
			>
	) {}

	async load(
		publisher: string,
		version: string,
		chapterRef: string
	): Promise<boolean> {
		const individual:
			PublishedResourceReference = {
				publisher,

				resourceId:
					`${BIBLE_CHAPTER_RESOURCE_TYPE}/${version}/${chapterRef}`
			};

		const individualFound =
			await this.resources.install(
				individual
			);

		if (individualFound) {
			return true;
		}

		const bundle:
			PublishedResourceReference = {
				publisher,

				resourceId:
					`${BIBLE_CHAPTER_RESOURCE_TYPE}/${version}`
			};

		return await this.resources.install(
			bundle
		);
	}
}