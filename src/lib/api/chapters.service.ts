import { api } from './api'
import { bibleDB } from '../db/bible.db';
import { base } from '$app/paths';
import { browser } from '$app/environment';

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
            return await api.get(`data/json.gz/${chapterKey}.json.gz`);
        }

        return chapter;
    }
}

export let chapterService = new ChapterService()