import { bibleStorer } from '../storer/bible.storer';

import {
    ANNOTATIONS,
    UNSYNCED_ANNOTATIONS,
    NOTES,
    UNSYNCED_NOTES,
    CHAPTERS,
    BOOKNAMES,
    SEARCH,
    STRONGS,
} from "$lib/storer/bible.db";

import { offlineApi } from './offline.api';

export class ChapterService {

    extractBookChapter(chapterKey: string): string {
        let bcvw = chapterKey.split('_')
        if (bcvw.length > 2) {
            chapterKey = `${bcvw[0]}_${bcvw[1]}`
        }
        return chapterKey
    }

    async getChapter(chapterKey: string): Promise<any> {
        chapterKey = this.extractBookChapter(chapterKey)
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

    async getAnnotations(chapterKey: string): Promise<any> {
        chapterKey = this.extractBookChapter(chapterKey)
        let annotations = await offlineApi.cacheHit(
            chapterKey,
            UNSYNCED_ANNOTATIONS,
            ANNOTATIONS
        )
        
        if (!annotations) {
            annotations = {
                id: chapterKey,
                version: 0,
                annots: {}
            }
        }
        return annotations;
    }

    async putAnnotations(data: any): Promise<any> {
        let path = '/annots'
        let unsyncedDB = UNSYNCED_ANNOTATIONS
        let syncedDB = ANNOTATIONS
        return await offlineApi.put(data, path, unsyncedDB, syncedDB)
    }

    // TODO update import export
    async putAllAnnotations(objects: any): Promise<any> {
        try {
            await bibleStorer.putBulkValue(ANNOTATIONS, objects)
        } catch (error) {
            console.log(`error importing all annotations from indexedDB: ${error}`)
        }
    }

    async putNote(data: any): Promise<any> {
        let path = '/notes'
        let unsyncedDB = UNSYNCED_NOTES
        let syncedDB = NOTES
        return offlineApi.put(data, path, unsyncedDB, syncedDB)
    }

    async getAllAnnotations(): Promise<any> {
        let data: any = undefined
        try {
            data = await bibleStorer.getAllValue(ANNOTATIONS)
        } catch (error) {
            console.log(`error getting all annotations from indexedDB: ${error}`)
        }
        return data
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

export let chapterService = new ChapterService()