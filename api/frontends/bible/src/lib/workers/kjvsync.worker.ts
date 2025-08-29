import { BibleService } from "$lib/db/bible.service";
import { ChapterService } from "$lib/api/chapters.api";
import {Api} from '$lib/api/api'
import {
    BibleDB,
    ANNOTATIONS,
    UNSYNCED_ANNOTATIONS,
    NOTES,
    UNSYNCED_NOTES,
    CHAPTERS,
    BOOKNAMES,
    SEARCH,
    STRONGS
} from "$lib/db/bible.db";


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

let db = await BibleDB.CreateAsync()
let api = new Api()

async function syncAnnotsAndNotesFromServer(data: any) {
    api.setBearerToekn(data.token)
    let chapterService = new ChapterService(api, new BibleService(db))

    // ----------------- SYNC ANNOTS ------------------------------------------
    await chapterService.sync('/annots', UNSYNCED_ANNOTATIONS, ANNOTATIONS)
    postMessage({ id: 'annotations' })

    // ----------------- SYNC NOTES -------------------------------------------
    await chapterService.sync('/notes', UNSYNCED_NOTES, NOTES)
    postMessage({ id: 'notes' })
}

// --------------------- SYNC STATIC DATA -------------------------------------
async function fetchAndStoreAllBibleChapters() {
    try {
        let json = await api.getstatic(`/data/json.gz/all.json`)
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
        let json = await api.getstatic(`/data/json.gz/booknames.json`)
        json['id'] = BOOKNAMES;
        db.putValue(BOOKNAMES, json);
    } catch (err) {
        console.log(`error: ${err}`)
    }
}

async function fetchAndStoreSearchBibleIndex() {
    try {
        let json = await api.getstatic(`/data/json.gz/bibleindex.json`)
        db.putValue(SEARCH, json);
    } catch (err) {
        console.log(`error: ${err}`)
    }
}

async function fetchAndStoreStrongsDefs() {
    try {
        let json = await api.getstatic(`/data/strongs.json.gz/all.json`)
        let defs = new Map<string, any>(Object.entries(json));
        defs.forEach((def: any, key: string) => {
            def['id'] = key;
            db.putValue(STRONGS, def);
        });
    } catch (err) {
        console.log(`error: ${err}`)
    }
}