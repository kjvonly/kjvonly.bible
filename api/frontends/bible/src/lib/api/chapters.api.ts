import { api } from './api'
import { bibleService } from '../db/bible.service';
import { BASE_URL, API_URL } from "$lib/utils/paths";

import * as db from '../db/bible.db';
import { toastService } from '$lib/services/toast.service';
import { authService } from '$lib/services/auth.service';

export class ChapterService {

    async getChapter(chapterKey: string): Promise<any> {
        let chapter = undefined
        let bcvw = chapterKey.split('_')
        if (bcvw.length > 2) {
            chapterKey = `${bcvw[0]}_${bcvw[1]}`
        }

        try {
            chapter = await bibleService.getValueIfCacheIsReady('chapters', chapterKey)
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
            booknames = await bibleService.getValue('booknames', 'booknames')

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
            searchIndex = await bibleService.getValue('searchIndex', 'v1')

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
            strongs = await bibleService.getValue('strongs', key)
        } catch (error) {
            console.log(`error getting chapter ${key} from indexdb: ${error}`)
        }

        if (strongs === undefined) {
            return await api.getstatic(`/data/strongs.json.gz/${key}.json`);
        }

        return strongs;
    }

    async sync(path: string, unsyncedDB: string, syncedDB: string) {
        let lastDateUpdated = 0
        let dateUpdatedSynced = 0
        try {
            let ldu = await bibleService.getValue(syncedDB, bibleService.LAST_DATE_UPDATED_ID)
            if (ldu !== undefined) {
                lastDateUpdated = ldu.timestamp + 1
            }
            let shouldContinue = true
            let currentPage = 1
            let rows = 10


            while (shouldContinue) {
                let resp = await api.get(`${path}?start_updated_date=${lastDateUpdated}&orderBy=date_updated,ASC&page=${currentPage}&rows=${rows}`)
                if (resp.ok) {
                    let page = await resp.json()
                    for (let i = 0; i < page.items.length; i++) {
                        if (page.items[i].dateDeleted > 0) {
                            await bibleService.deleteValue(syncedDB, page.items[i].id)
                            await bibleService.deleteValue(unsyncedDB, page.items[i].id)
                            dateUpdatedSynced = page.items[i].dateUpdated
                        } else {
                            await bibleService.putValue(syncedDB, page.items[i])
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

        if (dateUpdatedSynced) {
            let dateUpdatedData = {
                id: bibleService.LAST_DATE_UPDATED_ID,
                timestamp: dateUpdatedSynced
            }
            await bibleService.putValue(syncedDB, dateUpdatedData)
        }

        let unsyncedEntries = await bibleService.getAllValue(unsyncedDB)
        for (let i = 0; i < unsyncedEntries.length; i++) {
            let e = unsyncedEntries[i]
            if (e.dateDeleted > 0) {
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
            annotations = await bibleService.getValue(db.UNSYNCED_ANNOTATIONS, chapterKey)

            if (annotations === undefined) {
                annotations = await bibleService.getValue(db.ANNOTATIONS, chapterKey)
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

        try {
            let resp = await api.get(`${path}/${id}`)
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
        return await this.put(data, path, unsyncedDB, syncedDB)

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
                result = await api.post(path, data)
            } else {
                result = await api.update(`${path}/${data.id}`, data)
            }

            if (!result.ok) {
                // BAD REQUEST or Already Exists
                if (result.status === 400 || result.status === 409) {
                    let annots = await this.fetch(data.id, path)
                    if (annots !== undefined) {
                        bibleService.deleteValue(unsyncedDB, data.id)
                        bibleService.putValue(syncedDB, annots)
                    }
                    toastService.showToast("Discarded stale versions. Please update lastest version.")
                    return annots
                } else {
                    return await this.onFailurePut(result.status, data, unsyncedDB, `status code ${result.status}, expected 200`)
                }
            }
            else {
                bibleService.deleteValue(unsyncedDB, data.id)
            }

            let obj = await result.json()

            await bibleService.putValue(syncedDB, obj)

            return obj

        } catch (error) {
            return await this.onFailurePut(undefined, data, unsyncedDB, error)
        }
    }

    async onFailurePut(statusCode: number | undefined, data: any, unsyncedDB: string, error: any): Promise<any> {
        console.log(`error putting  ${data?.id}: storing to unsynced cache:  ${error}: `)
        data.version = data.version - 1

        let toastMessage = "Offline Mode: sync will occur when service is reachable."
        if (statusCode === 401) {
            if (authService.hasLoggedIn()) {
                toastMessage = "Offline Mode: sign in again to save changes."
            } else {
                toastMessage = "Offline Mode: sign in to save changes."
            }
        }
        toastService.showToast(toastMessage)
        await bibleService.putValue(unsyncedDB, data)
        return data
    }

    async delete(data: any, path: string, unsyncedDB: string, syncedDB: string): Promise<any> {
        try {
            let result = await api.delete(`${path}/${data.id}`)

            if (result.ok) {
                await bibleService.deleteValue(unsyncedDB, data.id)
                await bibleService.deleteValue(syncedDB, data.id)
            } else {
                await bibleService.putValue(unsyncedDB, data)
                await bibleService.deleteValue(syncedDB, data.id)
                console.log(`Failed to delete ${path}/${data.id}`)
            }
        } catch (error) {
            console.log(`Failed to delete ${path}/${data.id}: ${error}`)
        }
    }

    async getAllAnnotations(): Promise<any> {
        let data: any = undefined
        try {
            data = await bibleService.getAllValue(db.ANNOTATIONS)
        } catch (error) {
            console.log(`error getting all annotations from indexedDB: ${error}`)
        }
        return data
    }

    async getAllNotes(): Promise<any> {
        let data: any = undefined
        try {
            data = await bibleService.getAllValue(db.NOTES)
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
            await bibleService.putBulkValue(db.ANNOTATIONS, objects)
        } catch (error) {
            console.log(`error importing all annotations from indexedDB: ${error}`)
        }
    }
}

export let chapterService = new ChapterService()