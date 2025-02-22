import { api } from './api'
import { bibleDB } from '../db/bible.db';


export class ChapterService {

    timeout(prom: Promise<any>, time: number) {
        /**
         * https://stackoverflow.com/questions/8778718/how-to-implement-a-function-timeout-in-javascript-not-just-the-settimeout
         *
         * We cache the entire bible and strongs defs in indexdb. 
         *     1. Download the content
         *     2. Insert each verse and strongs def to indexdb (15,000)
         *
         * This takes place in the kjvdata.worker.ts so the app is still usable while seeding the db.
         *
         * This timeout is necessary on first load of the app. If the indexdb is still seeding, based on time in ms exceeded, 
         * calls are made to the server to retrieve data.
         *
         * Not much incentive to decrease the seed time since it only happens once on app load and with new data versions.
         *
         *   */
        const timeoutError = new Error(`execution time has exceeded the allowed time frame of ${time} ms`);
        let timer: any; // will receive the setTimeout defined from time 

        timeoutError.name = "TimeoutErr";

        return Promise.race([
            prom,
            new Promise((_r, rej) => timer = setTimeout(rej, time, timeoutError)) // returns the defined timeoutError in case of rejection
        ]).catch(err => { // handle errors that may occur during the promise race
            throw (err);
        }).finally(() => clearTimeout(timer)); // clears timer 
    }

    async getChapter(chapterKey: string): Promise<any> {
        let chapter = undefined
        let bcvw = chapterKey.split('_')
        if (bcvw.length > 2) {
            chapterKey = `${bcvw[0]}_${bcvw[1]}`
        }

        try {
            // chapter = await this.timeout(bibleDB.getValue('chapters', chapterKey), 1000)
            if (bibleDB.isReady) {
                await bibleDB.ready
                chapter = await bibleDB.getValue('chapters', chapterKey)
            }

        } catch (error) {
            console.log(`error getting chapter ${chapterKey} from indexdb: ${error}`)
        }

        if (chapter === undefined) {
            return await api.get(`data/json.gz/${chapterKey}.json`);
        }

        return chapter;
    }


    async getBooknames(): Promise<any> {
        let booknames = undefined;

        try {
            // chapter = await this.timeout(bibleDB.getValue('chapters', chapterKey), 1000)
            if (bibleDB.isReady) {
                await bibleDB.ready
                booknames = await bibleDB.getValue('booknames', 'booknames')
            }

        } catch (error) {
            console.log(`error getting booknames from indexedDB: ${error}`)
        }

        if (booknames === undefined) {
            return await api.get(`data/json.gz/booknames.json`);
        }

        return booknames;
    }


    async getSearchIndex(): Promise<any> {
        let searchIndex = undefined;

        try {
            if (bibleDB.isReady) {
                await bibleDB.ready
                searchIndex = await bibleDB.getValue('searchIndex', 'v1')
            }

        } catch (error) {
            console.log(`error getting searchIndex from indexedDB: ${error}`)
        }

        if (searchIndex === undefined) {
            return await api.get(`data/json.gz/.json`);
        }

        return searchIndex;
    }


    async getStrongs(key: string): Promise<any> {
        let strongs = undefined

        try {
            // chapter = await this.timeout(bibleDB.getValue('chapters', chapterKey), 1000)
            if (bibleDB.isReady) {
                await bibleDB.ready
                strongs = await bibleDB.getValue('strongs', key)
            }

        } catch (error) {
            console.log(`error getting chapter ${key} from indexdb: ${error}`)
        }

        if (strongs === undefined) {
            return await api.get(`data/strongs.json.gz/${key}.json`);
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
            // chapter = await this.timeout(bibleDB.getValue('chapters', chapterKey), 1000)

            await bibleDB.ready
            annotations = await bibleDB.getValue('annotations', chapterKey)


        } catch (error) {
            console.log(`error getting chapter ${chapterKey} from indexdb: ${error}`)
        }

        // update when/if storing remote
        // if (chapter === undefined) {
        //     return await api.get(`data/json.gz/${chapterKey}.json`);
        // }

        if (annotations === undefined) {
            annotations = { id: chapterKey }
        }
        return annotations;
    }

    async putAnnotations(data: any): Promise<any> {
        try {
            // chapter = await this.timeout(bibleDB.getValue('chapters', chapterKey), 1000)
            if (bibleDB.isReady) {
                await bibleDB.ready
                await bibleDB.putValue('annotations', data)
            }

        } catch (error) {
            console.log(`error putting  ${data?.id} from indexedDB: ${error}`)
        }

    }

    async getAllAnnotations(): Promise<any> {
        let data: any = undefined
        try {
            // chapter = await this.timeout(bibleDB.getValue('chapters', chapterKey), 1000)
            if (bibleDB.isReady) {
                await bibleDB.ready
                data = await bibleDB.getAllValue('annotations')
            }

        } catch (error) {
            console.log(`error getting all annotations from indexedDB: ${error}`)
        }

        return data

    }

    async putAllAnnotations(objects: any): Promise<any> {
        try {
            // chapter = await this.timeout(bibleDB.getValue('chapters', chapterKey), 1000)
            if (bibleDB.isReady) {
                await bibleDB.ready
                await bibleDB.putBulkValue('annotations', objects)
            }

        } catch (error) {
            console.log(`error importing all annotations from indexedDB: ${error}`)
        }
    }
}

export let chapterService = new ChapterService()