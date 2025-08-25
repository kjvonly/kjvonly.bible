import { ChapterService } from "$lib/api/chapters.api";
import { BibleDB } from "$lib/db/bible.db";
import { BibleService } from "$lib/db/bible.service";
import type { IDBPDatabase } from "idb";
export const API_URL = `${import.meta.env.VITE_API_URL}`

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

}

let db: BibleDB | undefined = undefined
let api: Api = new Api()

async function sync(data: any) {
    if (db === undefined) {
        db = await BibleDB.CreateAsync()
        db.ready = Promise.resolve(true)
    }

    token = data.token
    let chapterService = new ChapterService(api, new BibleService(db))
    await chapterService.syncAnnotatoins()
    postMessage({ id: 'annotations' })
}

onmessage = async (e) => {
    switch (e.data.action) {
        case 'init':
            await sync(e.data)
            break;
        case 'sync':
            await sync(e.data)
            break;
    }
}

export { };