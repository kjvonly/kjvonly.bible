import { api } from './api'
import { bibleStorer } from '../storer/bible.storer';

import {
    ANNOTATIONS,
    UNSYNCED_ANNOTATIONS,
    NOTES,
    UNSYNCED_NOTES,
} from "$lib/storer/bible.db";

import { offlineApi } from './offline.api';

export class ChapterService {

    async getChapter(chapterKey: string): Promise<any> {
        let chapter = undefined
        let bcvw = chapterKey.split('_')
        if (bcvw.length > 2) {
            chapterKey = `${bcvw[0]}_${bcvw[1]}`
        }

        try {
            chapter = await bibleStorer.getValueIfCacheIsReady('chapters', chapterKey)
        } catch (error) {
            console.log(`error getting chapter ${chapterKey} from indexdb: ${error}`)
        }

        if (chapter === undefined) {
            return await api.getstatic(`/data/json.gz/${chapterKey}.json`);
        }

        return chapter;
    }

    async getBooknames(): Promise<any> {
        let booknames = undefined;

        try {
            booknames = await bibleStorer.getValue('booknames', 'booknames')

        } catch (error) {
            console.log(`error getting booknames from indexedDB: ${error}`)
        }

        if (booknames === undefined) {
            return await api.getstatic(`/data/json.gz/booknames.json`);
        }

        return booknames;
    }


    async getSearchIndex(): Promise<any> {
        let searchIndex = undefined;

        try {
            searchIndex = await bibleStorer.getValue('searchIndex', 'v1')

        } catch (error) {
            console.log(`error getting searchIndex from indexedDB: ${error}`)
        }

        if (searchIndex === undefined) {
            return await api.getstatic(`/data/json.gz/bibleindex.json`);
        }

        return searchIndex;
    }


    async getStrongs(key: string): Promise<any> {
        let strongs = undefined

        try {
            strongs = await bibleStorer.getValue('strongs', key)
        } catch (error) {
            console.log(`error getting chapter ${key} from indexdb: ${error}`)
        }

        if (strongs === undefined) {
            return await api.getstatic(`/data/strongs.json.gz/${key}.json`);
        }

        return strongs;
    }

    

    // TODO generalize this for all requests.
    async getAnnotations(chapterKey: string): Promise<any> {
        let annotations = undefined

        let bcv = chapterKey.split('_')
        if (bcv.length === 3) {
            chapterKey = `${bcv[0]}_${bcv[1]}`
        }

        try {
            annotations = await bibleStorer.getValue(UNSYNCED_ANNOTATIONS, chapterKey)

            if (annotations === undefined) {
                annotations = await bibleStorer.getValue(ANNOTATIONS, chapterKey)
            }

            if (annotations === undefined) {
                annotations = {
                    id: chapterKey,
                    version: 0,
                    annots: {}
                }
            }

        } catch (error) {
            console.log(`error getting annotations ${chapterKey} from indexdb: ${error}`)
        }
        return annotations;
    }




    async putAnnotations(data: any): Promise<any> {
        let path = '/annots'
        let unsyncedDB = UNSYNCED_ANNOTATIONS
        let syncedDB = ANNOTATIONS
        return await offlineApi.put(data, path, unsyncedDB, syncedDB)

    }

    async putNote(data: any): Promise<any> {
        let path = '/notes'
        let unsyncedDB = UNSYNCED_NOTES
        let syncedDB = NOTES
        return await offlineApi.put(data, path, unsyncedDB, syncedDB)
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

    async putAllAnnotations(objects: any): Promise<any> {
        try {
            await bibleStorer.putBulkValue(ANNOTATIONS, objects)
        } catch (error) {
            console.log(`error importing all annotations from indexedDB: ${error}`)
        }
    }
}

export let chapterService = new ChapterService()