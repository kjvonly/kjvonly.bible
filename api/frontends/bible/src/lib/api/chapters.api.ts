import { api } from './api'
import { bibleService } from '../db/bible.service';
import { deepMerge } from '$lib/utils/deepmerge';

import * as db from '../db/bible.db';
import { toastService } from '$lib/services/toast.service';

export class ChapterService {

    api = api
    bibleService = bibleService

    constructor(api: any, bibleService: any) {
        this.api = api
        this.bibleService = bibleService
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

    async fetchAnnotations(chapterKey: string): Promise<any> {
        let annotations = undefined

        let bcv = chapterKey.split('_')
        if (bcv.length === 3) {
            chapterKey = `${bcv[0]}_${bcv[1]}`
        }

        try {
            let resp = await this.api.getapi(`/annots/${chapterKey}`)
            if (!resp.ok) {
                if (resp.status === 404) {
                    annotations = {
                        id: chapterKey,
                        version: 0,
                        annots: {}
                    }
                }
            } else {
                annotations = await resp.json()
            }

        } catch (error) {
            console.log(`error getting annotations ${chapterKey} from server: ${error}`)
        }
        return annotations;
    }


    async putAnnotations(data: any): Promise<any> {
        try {
            data.version = data.version + 1
            var result: Response

            if (data.version == 1) {
                result = await this.api.postapi('/annots', data)
            } else {
                result = await this.api.updateapi(`/annots/${data.id}`, data)
            }

            if (!result.ok) {
                if (result.status === 400 || result.status === 409) {
                    // BAD REQUEST or Already Exists
                    // remove unsynced versions
                    // sync the annotation
                    let annots = await this.fetchAnnotations(data.id)
                    if (annots !== undefined) {
                        this.bibleService.deleteValue(db.UNSYNCED_ANNOTATIONS, data.id)
                        this.bibleService.putValue(db.ANNOTATIONS, annots)
                    }
                    toastService.showToast("Discarded stale versions. Please update lastest annotations.")
                    return annots
                } else {
                    await this.onFailurePutAnnotations(data, `status code ${result.status}, expected 200`)
                }
            }

            let ua = await result.json()

            await this.bibleService.putValue(db.ANNOTATIONS, ua)

            return ua

        } catch (error) {
            await this.onFailurePutAnnotations(data, error)
        }
    }

    async onFailurePutAnnotations(data: any, error: any) {
        console.log(`error putting  ${data?.id}: storing to unsynced cache:  ${error}: `)
        data.version = data.version - 1
        await this.bibleService.putValue(db.UNSYNCED_ANNOTATIONS, data)
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