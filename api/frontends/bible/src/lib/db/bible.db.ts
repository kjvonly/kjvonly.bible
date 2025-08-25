import { sleep } from '$lib/utils/sleep';
import IndexedDB from './idb.db';


export const enum STORES {
	CHAPTERS,
	BOOKNAMES,
	STRONGS,
	ANNOTATIONS,
	NOTES,
	SEARCH,
	UNSYNCED_ANNOTATIONS,
	UNSYNCED_NOTES
}

export const DB_NAME = 'bible'
export const CHAPTERS = 'chapters'
export const BOOKNAMES = 'booknames'
export const STRONGS = 'strongs'
export const ANNOTATIONS = 'annotations'
export const NOTES = 'notes'
export const SEARCH = 'search'
export const UNSYNCED_ANNOTATIONS = 'unsynced_annotations'
export const UNSYNCED_NOTES = 'unsynced_notes'

/*
* NOTE: github does not ungzip your files so we zcat them to .json on
* build/deploy. do the same thing in your dev environment
* 
*  for i in $(ls -1); do zcat $i > ${i%%.gz} ; done 
*  run this in the static/data/(json.gz|strongs.gz.gz) directories in
*  your dev environment
*/
const TOTAL_CHAPTERS_KEYS = 1189

/** BOOKNAMES is metadata on all bible chapters. */
const TOTAL_BOOKNAMES_KEYS = 1

const TOTAL_STRONGS_KEYS = 14058

export class BibleDB extends IndexedDB {
	instance: any;
	resolve: any;
	ready: Promise<boolean | undefined> = new Promise((resolve, reject) => {
		this.resolve = resolve;
	});

	/** 
	 * isReady is a check to see if the cacheIsReady. 
	 * This allows the caller to check this status to determine 
	 * if they want to wait for the cache to sync or if they want 
	 * to make a REST call to retrieve the data. 
	 * */
	isReady = false
	worker: Worker | undefined = undefined

	constructor() {
		super(DB_NAME);
	}

	async waitForSearchIndex(): Promise<boolean> {
		while (1) {
			let searchIndex = await this.getValue(SEARCH, 'v1');
			if (
				searchIndex
			) {
				this.resolve(true)
				this.isReady = true
				return true
			}
			await sleep(1000)
		}
		return false
	}

	async init() {
		this.worker = new Worker(new URL('../workers/kjvdata.worker?worker', import.meta.url), {
			type: 'module'
		});

		if (!this.worker) {
			return
		}

		let syncedChapters = await this.syncChapters()
		let syncedBooknames = await this.syncBooknames()

		if (syncedChapters && syncedBooknames) {
			this.resolve(true);
			this.isReady = true
		}

		/** this is after resolving since i want the user to be able to start
		 * reading/searching the app as soon as possible. There 14k strong
		 * defs that need to be cached
		 */
		await this.syncStrongs()
		await this.syncSearchIndex()

	}


	// TODO update syncs to be generic.
	// implement a count call to index db to just return the count.
	async syncChapters() {
		let keys = await this.getAllKeys(CHAPTERS);
		if (keys.length < TOTAL_CHAPTERS_KEYS) {
			this.worker?.postMessage({ sync: CHAPTERS });

			let retries = 0;
			let retryMax = 10;

			while (keys.length < TOTAL_CHAPTERS_KEYS || retries == retryMax) {
				await sleep(1000);
				keys = await this.getAllKeys(CHAPTERS);
				retries = retries + 1;
			}

			if (retries === retryMax) {
				return false;
			}
		}

		return true
	}

	async syncBooknames() {
		let keys = await this.getAllKeys(BOOKNAMES);

		if (keys.length < TOTAL_BOOKNAMES_KEYS) {
			this.worker?.postMessage({ sync: BOOKNAMES });

			let retries = 0;
			let retryMax = 10;

			while (keys.length < TOTAL_BOOKNAMES_KEYS || retries == retryMax) {

				await sleep(1000);
				keys = await this.getAllKeys(BOOKNAMES);
				retries = retries + 1;
			}

			if (retries === retryMax) {
				return false;
			}
		}

		return true
	}

	async syncSearchIndex() {
		let searchIndex = await this.getValue(SEARCH, 'v1');

		if (!searchIndex) {
			this.worker?.postMessage({ sync: SEARCH });

			let retries = 0;
			let retryMax = 10;

			while (!searchIndex || retries == retryMax) {

				await sleep(1000);
				searchIndex = await this.getValue(SEARCH, 'v1');
				retries = retries + 1;
			}

			if (retries === retryMax) {
				return false;
			}
		}

		return true
	}


	async syncStrongs() {
		let keys = await this.getAllKeys(STRONGS);
		if (keys.length < TOTAL_STRONGS_KEYS) {
			this.worker?.postMessage({ sync: STRONGS });

			let retries = 0;
			let retryMax = 10;

			while (keys.length < TOTAL_STRONGS_KEYS || retries == retryMax) {
				await sleep(1000);
				keys = await this.getAllKeys(STRONGS);
				retries = retries + 1;
			}

			if (retries === retryMax) {
				return false;
			}
		}

		return true
	}

	   public static async CreateAsync(): Promise<BibleDB> {
        const instance = new BibleDB();
        await instance.createAndOrOpenObjectStores(
			[
				CHAPTERS,
				BOOKNAMES,
				STRONGS,
				ANNOTATIONS,
				NOTES,
				SEARCH,
				UNSYNCED_ANNOTATIONS,
				UNSYNCED_NOTES,
			]);
        return instance;
    }
}


export const bibleDB = await BibleDB.CreateAsync();
