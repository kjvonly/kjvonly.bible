import { ChapterService } from "$lib/api/chapters.api";
import { BibleDB, ANNOTATIONS, UNSYNCED_ANNOTATIONS, NOTES, UNSYNCED_NOTES } from "$lib/db/bible.db";
import { BibleService } from "$lib/db/bible.service";
const API_URL = `${import.meta.env.VITE_API_URL}`
const BASE_URL = `${import.meta.env.VITE_BASE_URL}/`

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

let db: BibleDB | undefined = undefined
let api: Api = new Api()

async function sync(data: any) {
    if (db === undefined) {
        db = await BibleDB.CreateAsync()
    }

    token = data.token
    let chapterService = new ChapterService(api, new BibleService(db))
    await chapterService.sync('/annots',  UNSYNCED_ANNOTATIONS, ANNOTATIONS)
    postMessage({ id: 'annotations' })

    await chapterService.sync('/notes',  UNSYNCED_NOTES, NOTES)
    postMessage({ id: 'notes' })
}


// SYNC BIBLE DATA


const myHeaders = new Headers();
myHeaders.append('Content-Type', 'application/json');
myHeaders.append('Transfer-Encoding', 'gzip');


async function onChapters() {
	let db = await BibleDB.CreateAsync()
	fetch(`${BASE_URL}data/json.gz/all.json`, {
		headers: myHeaders
	}).then((res) => {
		res.json().then((json) => {
			let myMap = new Map<string, any>(Object.entries(json));
			myMap.forEach((value: any, key: string) => {
				value['id'] = key;
				db.putValue('chapters', value);
			});
		});
	}).catch((err) => {
		console.log(`error: ${err}`)
	});
}	

async function onBooknames() {
	let db = await BibleDB.CreateAsync()
	fetch(`${BASE_URL}data/json.gz/booknames.json`, {
		headers: myHeaders
	}).then((res) => {

		res.json().then((json) => {
			json['id'] = 'booknames';
			db.putValue('booknames', json);
		});
	}).catch((err) => {
		console.log(`error: ${err}`)
	});;
}

async function onSearch() {
	let db = await BibleDB.CreateAsync()
	fetch(`${BASE_URL}data/json.gz/bibleindex.json`, {
		headers: myHeaders
	}).then((res) => {

		res.json().then((json) => {
			db.putValue('search', json);
		});
	}).catch((err) => {
		console.log(`error: ${err}`)
	});;
}

async function onStrongs() {
	let db = await BibleDB.CreateAsync()
	fetch(`${BASE_URL}data/strongs.json.gz/all.json`, {
		headers: myHeaders
	}).then((res) => {
		res.json().then((json) => {
			let myMap = new Map<string, any>(Object.entries(json));
			myMap.forEach((value: any, key: string) => {
				value['id'] = key;
				db.putValue('strongs', value);
			});
		});
	}).catch((err) => {
		console.log(`error: ${err}`)
	});
}

onmessage = async (e) => {
    switch (e.data.action) {
        case 'init':
            await sync(e.data)
            break;
        case 'sync':
            await sync(e.data)
            break;
        case 'chapters':
			onChapters();
			break;
		case 'booknames':
			onBooknames();
			break;
		case 'strongs':
			onStrongs();
			break;
		case 'search':
			onSearch();
    }
}

export { };