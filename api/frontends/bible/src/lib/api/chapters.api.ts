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


    async putNote(data: any): Promise<any> {
        let path = '/notes'
        let unsyncedDB = UNSYNCED_NOTES
        let syncedDB = NOTES
        return offlineApi.put(data, path, unsyncedDB, syncedDB)
    }

    

    async getAllNotes(): Promise<any> {
        let data: any = undefined
        try {
            data = await bibleStorer.getAllValue(NOTES)
        } catch (error) {
            console.log(`error getting all annotations from indexedDB: ${error}`)
        }
        return data
    }

    async deleteNote(noteID: string): Promise<any> {
        let path: string = `/notes`
        let delNte = {
            id: noteID,
            dateDeleted: Date.now()
        }
        await offlineApi.delete(delNte, path, UNSYNCED_NOTES, NOTES)
    }
}

export let chapterApi = new ChapterApi()