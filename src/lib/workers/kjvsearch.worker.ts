import { bibleDB } from "$lib/db/bible.db"
import FlexSearch from 'flexsearch';

let index = new FlexSearch.Index();
index.addAsync('50_3_16', "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.")
index.addAsync('50_3_17', "For God sent not his Son into the world to condemn the world; but that the world through him might be saved.")


const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


onmessage = async () => {
    console.log('hi from search worker')

    await bibleDB.init()
    postMessage(`ready `)
    let keys = await bibleDB.getAllKeys('chapters')

    postMessage(`keys are ${JSON.stringify(keys)}`)
}

export { };