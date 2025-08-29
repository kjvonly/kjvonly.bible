import { Api } from './api'
import { bibleService } from '../db/bible.service';
import { BASE_URL, API_URL } from "$lib/utils/paths";

import * as db from '../db/bible.db';
import { toastService } from '$lib/services/toast.service';

export class ChapterService {
    api
    bibleService = bibleService

    constructor(api: any, bs: any) {
        this.api = api
        this.bibleService = bs
    }

    async getChapter(chapterKey: string): Promise<any> {
        let chapter = undefined
        let bcvw = chapterKey.split('_')
        if (bcvw.length > 2) {
            chapterKey = `${bcvw[0]}_${bcvw[1]}`
        }

        try {
            chapter = await this.bibleService.getValueIfCacheIsReady('chapters', chapterKey)
        } catch (error) {
            console.log(`error getting chapter ${chapterKey} from indexdb: ${error}`)
        }

        if (chapter === undefined) {
            return await this.api.getstatic(`/data/json.gz/${chapterKey}.json`);
        }

        return chapter;
    }

    async getBooknames(): Promise<any> {
        let booknames = undefined;

        try {
            booknames = await this.bibleService.getValue('booknames', 'booknames')

        } catch (error) {
            console.log(`error getting booknames from indexedDB: ${error}`)
        }

        if (booknames === undefined) {
            return await this.api.getstatic(`/data/json.gz/booknames.json`);
        }

        return booknames;
    }


    async getSearchIndex(): Promise<any> {
        let searchIndex = undefined;

        try {
            searchIndex = await this.bibleService.getValue('searchIndex', 'v1')

        } catch (error) {
            console.log(`error getting searchIndex from indexedDB: ${error}`)
        }

        if (searchIndex === undefined) {
            return await this.api.getstatic(`/data/json.gz/bibleindex.json`);
        }

        return searchIndex;
    }


    async getStrongs(key: string): Promise<any> {
        let strongs = undefined

        try {
            strongs = await this.bibleService.getValue('strongs', key)
        } catch (error) {
            console.log(`error getting chapter ${key} from indexdb: ${error}`)
        }

        if (strongs === undefined) {
            return await this.api.getstatic(`/data/strongs.json.gz/${key}.json`);
        }

        return strongs;
    }

    async sync(path: string, unsyncedDB: string, syncedDB: string) {
        let lastDateUpdated = 0
        let dateUpdatedSynced = 0
        try {
            let ldu = await this.bibleService.getValue(syncedDB, this.bibleService.LAST_DATE_UPDATED_ID)
            if (ldu !== undefined) {
                lastDateUpdated = ldu.timestamp + 1
            }
            let shouldContinue = true
            let currentPage = 1
            let rows = 10

            
            while (shouldContinue) {
                let resp = await this.api.get(`${path}?start_updated_date=${lastDateUpdated}&orderBy=date_updated,ASC&page=${currentPage}&rows=${rows}`)
                if (resp.ok) {
                    let page = await resp.json()
                    for (let i = 0; i < page.items.length; i++) {
                        if (page.items[i].dateDeleted > 0) {
                            await this.bibleService.deleteValue(syncedDB, page.items[i].id)
                            await this.bibleService.deleteValue(unsyncedDB, page.items[i].id)
                            dateUpdatedSynced = page.items[i].dateUpdated
                        } else {
                            await this.bibleService.putValue(syncedDB, page.items[i])
                            dateUpdatedSynced = page.items[i].dateUpdated
                        }
                    }

                    if (currentPage < Math.round(page.total / rows)) {
                        currentPage = currentPage + 1
                    } else {
                        shouldContinue = false
                    }

                } else {
                    shouldContinue = false
                    console.log(`error syncing annotations from server: ${await resp.json()}`)
                }
            }

        } catch (error) {
            console.log(`error getting ${path} from ${lastDateUpdated} from server: ${error}`)
        }

        if (dateUpdatedSynced){
            let dateUpdatedData ={
                id: bibleService.LAST_DATE_UPDATED_ID,
                timestamp:dateUpdatedSynced
            }
            await this.bibleService.putValue(syncedDB, dateUpdatedData)
        }

        let unsyncedEntries = await this.bibleService.getAllValue(unsyncedDB)
        for (let i = 0; i < unsyncedEntries.length; i++) {
            let e = unsyncedEntries[i]
            if (e.dateDeleted > 0){
                this.delete(e, path, unsyncedDB, syncedDB)
            }
            await this.put(e, path, unsyncedDB, syncedDB)
        }
    }

    // TODO generalize this for all requests.
    async getAnnotations(chapterKey: string): Promise<any> {
        let annotations = undefined

        let bcv = chapterKey.split('_')
        if (bcv.length === 3) {
            chapterKey = `${bcv[0]}_${bcv[1]}`
        }

        try {
            annotations = await this.bibleService.getValue(db.UNSYNCED_ANNOTATIONS, chapterKey)

            if (annotations === undefined) {
                annotations = await this.bibleService.getValue(db.ANNOTATIONS, chapterKey)
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

    async fetch(id: string, path: string): Promise<any> {
        let annotations = undefined

        // let bcv = id.split('_')
        // if (bcv.length === 3) {
        //     id = `${bcv[0]}_${bcv[1]}`
        // }

        try {
            let resp = await this.api.get(`${path}/${id}`)
            if (resp.ok) {
                annotations = await resp.json()
            }
        } catch (error) {
            console.log(`error getting annotations ${id} from server: ${error}`)
        }
        return annotations;
    }


    async putAnnotations(data: any): Promise<any> {
        let path = '/annots'
        let unsyncedDB = db.UNSYNCED_ANNOTATIONS
        let syncedDB = db.ANNOTATIONS
        let annotations = await this.put(data, path, unsyncedDB, syncedDB)
        return annotations
    }

    async putNote(data: any): Promise<any> {
        let path = '/notes'
        let unsyncedDB = db.UNSYNCED_NOTES
        let syncedDB = db.NOTES
        return await this.put(data, path, unsyncedDB, syncedDB)
    }

    async put(data: any, path: string, unsyncedDB: string, syncedDB: string): Promise<any> {
        try {
            data.version = data.version + 1
            var result: Response

            if (data.version == 1) {
                result = await this.api.post(path, data)
            } else {
                result = await this.api.update(`${path}/${data.id}`, data)
            }

            if (!result.ok) {
                if (result.status === 400 || result.status === 409) {
                    // BAD REQUEST or Already Exists
                    // remove unsynced versions
                    // sync the annotation
                    let annots = await this.fetch(data.id, path)
                    if (annots !== undefined) {
                        this.bibleService.deleteValue(unsyncedDB, data.id)
                        this.bibleService.putValue(syncedDB, annots)
                    }
                    toastService.showToast("Discarded stale versions. Please update lastest version.")
                    return annots
                } else {
                    await this.onFailurePut(data, unsyncedDB, `status code ${result.status}, expected 200`)
                }
            } else {
                this.bibleService.deleteValue(unsyncedDB, data.id)
            }

            let obj = await result.json()

            await this.bibleService.putValue(syncedDB, obj)

            return obj

        } catch (error) {
            await this.onFailurePut(data, unsyncedDB, error)
        }
    }

    async onFailurePut(data: any, unsyncedDB: string, error: any) {
        console.log(`error putting  ${data?.id}: storing to unsynced cache:  ${error}: `)
        data.version = data.version - 1
        toastService.showToast("Offline Mode: sync will occur when service is reachable.")
        await this.bibleService.putValue(unsyncedDB, data)
    }

    async delete(data: any, path: string, unsyncedDB: string, syncedDB: string): Promise<any> {
        try {
            let result = await this.api.delete(`${path}/{data.id}`)
      
            if (result.ok) {
                await this.bibleService.deleteValue(unsyncedDB, data.id)
                await this.bibleService.deleteValue(syncedDB, data.id)
            } else {
                    await this.bibleService.putValue(unsyncedDB, data)
                    await this.bibleService.deleteValue(syncedDB, data.id)
                    console.log(`Failed to delete ${path}/${data.id}`)
            }
        } catch (error) {
                    console.log(`Failed to delete ${path}/${data.id}: ${error}`)
        }
    }


    async getAllAnnotations(): Promise<any> {
        let data: any = undefined
        try {
            data = await this.bibleService.getAllValue(db.ANNOTATIONS)
        } catch (error) {
            console.log(`error getting all annotations from indexedDB: ${error}`)
        }
        return data
    }

    async getAllNotes(): Promise<any> {
        let data: any = undefined
        try {
            data = await this.bibleService.getAllValue(db.NOTES)
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
        await this.delete(delNte, path, db.UNSYNCED_NOTES, db.NOTES)
    }

    async putAllAnnotations(objects: any): Promise<any> {
        try {
            await this.bibleService.putBulkValue(db.ANNOTATIONS, objects)
        } catch (error) {
            console.log(`error importing all annotations from indexedDB: ${error}`)
        }
    }
}

export let chapterService = new ChapterService(new Api(), bibleService)