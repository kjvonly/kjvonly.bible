import { chapterService } from "$lib/api/chapters.api";
import { bibleDB } from "$lib/db/bible.db"
import FlexSearch, { type Id } from 'flexsearch';

let index = new FlexSearch.Index();

let verses: any = {}


/** if bible data ever changes we can use this function to 
 * export the flexsearch index and copy it to the data repo
 * to be copied to static dir on build.
 */
async function exportIndexToConsole() {
    let keys = await bibleDB.getAllKeys('chapters')
    let booknames: any = await bibleDB.getValue('booknames', 'booknames')

    for (const key of keys) {
        let chapter = await bibleDB.getValue('chapters', key.toString())
        if (key === 'booknames') {
            continue
        }

        for (const verseNumber of Object.keys(chapter['verseMap'])) {
            let bookChapter = key.toString().split('_')
            let text = `${booknames['shortNames'][bookChapter[0]]} ${bookChapter[1]}:${verseNumber} ${chapter['verseMap'][verseNumber]}`
            let id = `${key}_${verseNumber}`
            await index.addAsync(id, text)
        }
    }

    await index.export(
        (key, data) => { verses[key] = data !== undefined ? data : '' }
    )
    console.log('export Index', verses)
}

async function init() {
    let indexes = index.search('for god so')
    if (indexes.length === 0) {
        await bibleDB.waitForSearchIndex()

        let bibleIndex = await bibleDB.getValue('search', 'v1')
        delete bibleIndex['id']

        for (const key of Object.keys(bibleIndex)) {
            await index.import(key, bibleIndex[key])
        }

        postMessage({ id: 'init', verses: verses })

    } else {
        postMessage(`already indexed ${indexes}`)
    }
}

function onlyUnique(value: any, index: number, array: any[]) {
    return array.indexOf(value) === index;
}

async function search(id: string, text: string) {
    let startTime: any = new Date();

    let indexes = []
    let terms = text.split('OR')
    for (let i = 0; i < terms.length; i++) {
        let matches = await index.searchAsync(terms[i], 1000000)
        indexes.push(...matches)
    }

    let unique = indexes.filter(onlyUnique)

    unique = unique.sort((a: Id, b: Id) => {
        let asplit = a.toString().split('_').map(i => {
            return parseInt(i)
        })

        let bsplit = b.toString().split('_').map(i => {
            return parseInt(i)
        })

        let aval = (asplit[0] * 1000000) + (asplit[1] * 1000) + asplit[2]
        let bval = (bsplit[0] * 1000000) + (bsplit[1] * 1000) + bsplit[2]
        return aval - bval
    })

    let endTime: any = new Date();
    var timeDiff = endTime - startTime; //in ms

    let stats = {
        count: unique.length,
        time: `${timeDiff} ms`
    }
    postMessage({ id: id, indexes: unique, stats: stats })

}


let notesDocument = new FlexSearch.Document({
    document: {
        id: "id",
        index: ["title", "text", "tags[]:tag"]
    }
}
);

let notes: any = {}

async function initNotes() {


    let annotations = await chapterService.getAllAnnotations();
    notes = {}
    /**this will pull independent notes from 0_0_0_0 and all notes  */
    Object.keys(annotations).forEach((ch) => {
        Object.keys(annotations[ch]).forEach((v) => {
            if (annotations[ch][v].notes && annotations[ch][v].notes) {
                Object.keys(annotations[ch][v].notes.words).forEach((w) => {
                    Object.keys(annotations[ch][v].notes.words[w]).forEach((n) => {
                        notesDocument.addAsync(n, annotations[ch][v].notes.words[w][n]);
                        notes[n] = annotations[ch][v].notes.words[w][n]
                    });
                });
            }
        });
    });

    getAllNotes('*')
}


function addNote(noteID: string, note: any) {
    notes[noteID] = note
    notesDocument.add(noteID, note);
    getAllNotes('*')
}

function deleteNote(noteID: string) {
    delete notes[noteID]
    notesDocument.remove(noteID);
    getAllNotes('*')
}

async function searchNotes(id: string, searchTerm: string, indexes: string[]) {

    const results = await notesDocument.searchAsync(searchTerm, {
        index: indexes
    });

    let filteredNotes: any = {}
    results.forEach(r => {
        r.result.forEach(id => {
            filteredNotes[id] = notes[id]
        })
    })
    if (Object.keys(filteredNotes).length > 0) {
        postMessage({ id: id, notes: filteredNotes })
    }
}

function getAllNotes(id: string) {
    postMessage({ id: id, notes: notes })

}


onmessage = async (e) => {
    switch (e.data.action) {
        case 'init':
            await init()
            await initNotes()
            break;
        case 'search':
            await search(e.data.id, e.data.text)
            break;
        case 'initNotes':
            initNotes()
            break;
        case 'addNote':
            addNote(e.data.noteID, e.data.note)
            break;
        case 'deleteNote':
            deleteNote(e.data.noteID)
            break;
        case 'searchNotes':
            await searchNotes(e.data.id, e.data.text, e.data.indexes);
            break
        case 'getAllNotes':
            getAllNotes(e.data.id)
    }
}

export { };