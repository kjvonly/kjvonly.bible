import { api } from './api'
import { bibleService } from '../db/bible.service';
import { deepMerge } from '$lib/utils/deepmerge';

import * as db from '../db/bible.db';
import { toastService } from '$lib/services/toast.service';

export class ChapterService {

    api = api
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
            return await this.api.get(`data/json.gz/${chapterKey}.json`);
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
            return await this.api.get(`data/json.gz/booknames.json`);
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
            return await this.api.get(`data/json.gz/bibleindex.json`);
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
            return await this.api.get(`data/strongs.json.gz/${key}.json`);
        }

        return strongs;
    }

    async syncAnnotatoins() {
        let annotations = undefined
        let lastDateUpdated = 0

        try {
            let ldu = await this.bibleService.getValue(db.ANNOTATIONS, this.bibleService.LAST_DATE_UPDATED_ID)
            if (ldu !== undefined) {
                lastDateUpdated = ldu.timestamp + 1
            }
            let shouldContinue = true
            let page = 1
            let rows = 10
            while (shouldContinue) {
                let resp = await this.api.getapi(`/annots?start_updated_date=${lastDateUpdated}&order_by=date_updated,ASC&page=${page}&rows=${rows}`)
                if (resp.ok) {
                    annotations = await resp.json()
                    for (let i = 0; i < annotations.items.length; i++){
                        await this.bibleService.putValue(db.ANNOTATIONS, annotations.items[i])
                    }
                    
                    if ( page < Math.round(annotations.total / rows)) {
                        page = page + 1
                    } else {
                        shouldContinue = false
                    }

                } else {
                    shouldContinue = false
                    console.log(`error syncing annotations from server: ${await resp.json()}`)
                }
            }

        } catch (error) {
            console.log(`error getting annotations from ${lastDateUpdated} from server: ${error}`)
        }
        return annotations;
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

    async fetchAnnotations(id: string, path:string): Promise<any> {
        let annotations = undefined

        // let bcv = id.split('_')
        // if (bcv.length === 3) {
        //     id = `${bcv[0]}_${bcv[1]}`
        // }

        try {
            let resp = await this.api.getapi(`${path}/${id}`)
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
        if (annotations === undefined){
              annotations = {
                        id: data.id,
                        version: 0,
                        annots: {}
                    }
        }
        return annotations
    }

    async put(data: any, path: string, unsyncedDB: string, syncedDB: string): Promise<any> {
        try {
            data.version = data.version + 1
            var result: Response

            if (data.version == 1) {
                result = await this.api.postapi(path, data)
            } else {
                result = await this.api.updateapi(`${path}/${data.id}`, data)
            }

            if (!result.ok) {
                if (result.status === 400 || result.status === 409) {
                    // BAD REQUEST or Already Exists
                    // remove unsynced versions
                    // sync the annotation
                    let annots = await this.fetchAnnotations(data.id, path)
                    if (annots !== undefined) {
                        this.bibleService.deleteValue(unsyncedDB, data.id)
                        this.bibleService.putValue(syncedDB, annots)
                    }
                    toastService.showToast("Discarded stale versions. Please update lastest version.")
                    return annots
                } else {
                    await this.onFailurePutAnnotations(data, unsyncedDB, `status code ${result.status}, expected 200`)
                }
            }

            let obj = await result.json()

            await this.bibleService.putValue(syncedDB, obj)

            return obj

        } catch (error) {
            await this.onFailurePutAnnotations(data, unsyncedDB, error)
        }
    }

    async onFailurePutAnnotations(data: any, unsyncedDB:string,  error: any) {
        console.log(`error putting  ${data?.id}: storing to unsynced cache:  ${error}: `)
        data.version = data.version - 1
        toastService.showToast("Offline Mode: sync will occur when service is reachable.")
        await this.bibleService.putValue(unsyncedDB, data)
    }

    async getAllAnnotations(): Promise<any> {
        let data: any = undefined
        try {
            data = await this.bibleService.getAllValue('annotations')
        } catch (error) {
            console.log(`error getting all annotations from indexedDB: ${error}`)
        }
        return data
    }

    async putAllAnnotations(objects: any): Promise<any> {
        try {
            await this.bibleService.putBulkValue('annotations', objects)
        } catch (error) {
            console.log(`error importing all annotations from indexedDB: ${error}`)
        }
    }
}

export let chapterService = new ChapterService(api, bibleService)