import { bibleStorer } from '../storer/bible.storer';

import {
        NOTES,
    UNSYNCED_NOTES,
    CHAPTERS,
    BOOKNAMES,
    SEARCH,
    STRONGS,
} from "$lib/storer/bible.db";

import { offlineApi } from './offline.api';
import { extractBookChapter } from '$lib/utils/chapter';

export class ChapterApi {
    async getChapter(chapterKey: string): Promise<any> {
        chapterKey = extractBookChapter(chapterKey)
        return offlineApi.cacheHitThenFetch(
            `/data/json.gz/${chapterKey}.json`,
            chapterKey,
            CHAPTERS,
            CHAPTERS
        )
    }

    async getBooknames(): Promise<any> {
        return offlineApi.cacheHitThenFetch(
            `/data/json.gz/booknames.json`,
            BOOKNAMES,
            BOOKNAMES,
            BOOKNAMES
        )
    }

    async getSearchIndex(): Promise<any> {
        return offlineApi.cacheHitThenFetch(
            `/data/json.gz/bibleindex.json`,
            "v1",
            SEARCH,
            SEARCH
        )
    }

    async getStrongs(key: string): Promise<any> {
        return offlineApi.cacheHitThenFetch(
            `/data/strongs.json.gz/${key}.json`,
            key,
            STRONGS,
            STRONGS
        )
    }
}

export let chapterApi = new ChapterApi()