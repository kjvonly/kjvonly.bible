import { bibleStorer } from '../storer/bible.storer';

import {
	NOTES,
	UNSYNCED_NOTES,
	CHAPTERS,
	BOOKNAMES,
	SEARCH,
	STRONGS
} from '$lib/storer/bible.db';

import { offlineApi } from './offline.api';
import { bibleLocationReferenceService } from '$lib/services/bible/bibleLocationReference.service';

export class ChapterApi {
	async getChapter(bibleLocationRef: string): Promise<any> {
		bibleLocationRef =
			bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef);
		return offlineApi.cacheHitThenFetch(
			`/data/json.gz/${bibleLocationRef}.json`,
			bibleLocationRef,
			CHAPTERS,
			CHAPTERS
		);
	}

	async getBooknames(): Promise<any> {
		return offlineApi.cacheHitThenFetch(
			`/data/json.gz/booknames.json`,
			BOOKNAMES,
			BOOKNAMES,
			BOOKNAMES
		);
	}

	async getSearchIndex(): Promise<any> {
		return offlineApi.cacheHitThenFetch(
			`/data/json.gz/bibleindex.json`,
			'v1',
			SEARCH,
			SEARCH
		);
	}

	async getStrongs(key: string): Promise<any> {
		return offlineApi.cacheHitThenFetch(
			`/data/strongs.json.gz/${key}.json`,
			key,
			STRONGS,
			STRONGS
		);
	}
}

export let chapterApi = new ChapterApi();
