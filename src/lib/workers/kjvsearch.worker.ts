import { bibleDB } from "$lib/db/bible.db"
import FlexSearch from 'flexsearch';
import type { chapter } from "../../models/chapter";


let index = new FlexSearch.Index();

async function init() {
    let indexes = index.search('for god so')
    console.log(indexes)
    if (indexes.length === 0) {
        await bibleDB.init()
        postMessage(`ready `)

        let keys = await bibleDB.getAllKeys('chapters')
        keys.forEach(async (key: string) => {
            let chapter = await bibleDB.getValue('chapters', key)
            if (key === 'booknames') {
                return
            }

            Object.keys(chapter['verseMap']).forEach((k) => {
                index.addAsync(`${key}_${k}`, `${chapter['verseMap'][k]}`)
            })
        });

        postMessage(`keys are ${JSON.stringify(keys)}`)
    } else {
        postMessage(`already indexed ${indexes}`)
    }
}

onmessage = async (e) => {

    switch (e.data) {
        case 'init':
            await init()
            break;
    }


}

export { };