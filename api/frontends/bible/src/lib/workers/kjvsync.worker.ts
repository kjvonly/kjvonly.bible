import { BibleService } from "$lib/db/bible.service";
import { ChapterService } from "$lib/api/chapters.api";
import {
    BibleDB,
    ANNOTATIONS,
    UNSYNCED_ANNOTATIONS,
    NOTES,
    UNSYNCED_NOTES,
    CHAPTERS,
    BOOKNAMES
} from "$lib/db/bible.db";


const API_URL = `${import.meta.env.VITE_API_URL}`
const BASE_URL = `${import.meta.env.VITE_BASE_URL}/`


// can't access local storage from web worker. Need to duplicate this simple api class.
let token: any = undefined
class Api {
    async getapi(path: string): Promise<Response> {
        const myHeaders = new Headers();
        myHeaders.append('Content-Type', 'application/json');
        myHeaders.append('Transfer-Encoding', 'gzip');

        if (token !== undefined) {
            myHeaders.append('Authorization', `Bearer ${token}`)
        }

        return await fetch(`${API_URL}${path}`,
            {
                headers: myHeaders
            }
        );
    }

    // Temp function while combinding frontend to backend
    async postapi(path: string, data: any): Promise<Response> {
        let headers: any = {
            'Content-Type': 'application/json'
        }

        if (token !== undefined) {
            headers['Authorization'] = `Bearer ${token}`
        }

        return fetch(`${API_URL}${path}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });
    }

    async updateapi(path: string, data: any): Promise<Response> {
        let headers: any = {
            'Content-Type': 'application/json'
        }

        if (token !== undefined) {
            headers['Authorization'] = `Bearer ${token}`
        }

        return fetch(`${API_URL}${path}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data)
        });
    }
}


let db = await BibleDB.CreateAsync()
let api: Api = new Api()

async function syncAnnotsAndNotesFromServer(data: any) {
    token = data.token
    let chapterService = new ChapterService(api, new BibleService(db))

    // ----------------- SYNC ANNOTS ------------------------------------------
    await chapterService.sync('/annots', UNSYNCED_ANNOTATIONS, ANNOTATIONS)
    postMessage({ id: 'annotations' })

    // ----------------- SYNC NOTES -------------------------------------------
    await chapterService.sync('/notes', UNSYNCED_NOTES, NOTES)
    postMessage({ id: 'notes' })
}


// SYNC BIBLE DATA
const BIBLE_DATA_HEADERS = new Headers();
BIBLE_DATA_HEADERS.append('Content-Type', 'application/json');
BIBLE_DATA_HEADERS.append('Transfer-Encoding', 'gzip');

async function fetchAndStoreAllBibleChapters() {
    try {
        let res = await fetch(`${BASE_URL}data/json.gz/all.json`, {
            headers: BIBLE_DATA_HEADERS
        })

        let json = await res.json()
        let chapters = new Map<string, any>(Object.entries(json));
        chapters.forEach((chapter: any, chapterKey: string) => {
            chapter['id'] = chapterKey;
            db.putValue(CHAPTERS, chapter);
        });
    }
    catch (err) {
        console.log(`error: ${err}`)
    }
}

async function fetchAndStoreBooknames() {
    try {
        let res = await fetch(`${BASE_URL}data/json.gz/booknames.json`, {
            headers: BIBLE_DATA_HEADERS
        })
        let json = await res.json()
        json['id'] = BOOKNAMES;
        db.putValue(BOOKNAMES, json);
    } catch (err) {
        console.log(`error: ${err}`)
    }
}

async function fetchAndStoreSearchBibleIndex() {
    try {
        let res = await fetch(`${BASE_URL}data/json.gz/bibleindex.json`, {
            headers: BIBLE_DATA_HEADERS
        })
        let json = await res.json()
        db.putValue('search', json);

    } catch (err) {
        console.log(`error: ${err}`)
    }
}

async function fetchAndStoreStrongsDefs() {
    try {
        let res = await fetch(`${BASE_URL}data/strongs.json.gz/all.json`, {
            headers: BIBLE_DATA_HEADERS
        })
        let json = await res.json()
        let myMap = new Map<string, any>(Object.entries(json));
        myMap.forEach((value: any, key: string) => {
            value['id'] = key;
            db.putValue('strongs', value);
        });

    } catch (err) {
        console.log(`error: ${err}`)
    }
}

onmessage = async (e) => {
    switch (e.data.action) {
        case 'init':
            await syncAnnotsAndNotesFromServer(e.data)
            break;
        case 'sync':
            await syncAnnotsAndNotesFromServer(e.data)
            break;
        case 'chapters':
            fetchAndStoreAllBibleChapters();
            break;
        case 'booknames':
            fetchAndStoreBooknames();
            break;
        case 'strongs':
            fetchAndStoreStrongsDefs();
            break;
        case 'search':
            fetchAndStoreSearchBibleIndex();
    }
}