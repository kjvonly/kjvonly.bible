import { sleep } from '$lib/utils/sleep';
import IndexedDB from './idb.db';

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
	isReady = false
	worker: Worker | undefined = undefined

	constructor() {
		super('bible');
		this.createAndOrOpenObjectStores(['chapters', 'booknames', 'strongs']);
	}

	async waitForIndexDB(): Promise<boolean> {
		while (1) {
			let chapterKeys = await this.getAllKeys('chapters');
			let booknamesKeys = await this.getAllKeys('booknames');
			/** 
			 * NOTE chapterKeys.length >= TOTAL_CHAPTERS_KEYS 
			 * becuase version 1 indexedDB also included booknames
			 * version 2 we moved booknames to booknames store
			*/
			if (
				booknamesKeys.length === TOTAL_BOOKNAMES_KEYS &&
				chapterKeys.length >= TOTAL_CHAPTERS_KEYS
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
		console.log('metaurl', import.meta.url)
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

	}

	async syncChapters() {
		let keys = await this.getAllKeys('chapters');
		if (keys.length < TOTAL_CHAPTERS_KEYS) {
			this.worker?.postMessage({ sync: 'booknames' });

			let retries = 0;
			let retryMax = 10;

			while (keys.length < TOTAL_CHAPTERS_KEYS || retries == retryMax) {
				await sleep(1000);
				keys = await this.getAllKeys('chapters');
				retries = retries + 1;
			}

			if (retries === retryMax) {
				return false;
			}
		}

		return true
	}

	async syncBooknames() {
		let keys = await this.getAllKeys('booknames');

		if (keys.length < TOTAL_BOOKNAMES_KEYS) {
			this.worker?.postMessage({ sync: 'booknames' });

			let retries = 0;
			let retryMax = 10;

			while (keys.length < TOTAL_BOOKNAMES_KEYS || retries == retryMax) {

				await sleep(1000);
				keys = await this.getAllKeys('booknames');
				retries = retries + 1;
			}

			if (retries === retryMax) {
				return false;
			}
		}

		return true
	}


	async syncStrongs() {
		let keys = await this.getAllKeys('strongs');
		if (keys.length < TOTAL_STRONGS_KEYS) {
			this.worker?.postMessage({ sync: 'strongs' });

			let retries = 0;
			let retryMax = 10;

			while (keys.length < TOTAL_STRONGS_KEYS || retries == retryMax) {
				await sleep(1000);
				keys = await this.getAllKeys('strongs');
				retries = retries + 1;
			}

			if (retries === retryMax) {
				return false;
			}
		}

		return true
	}
}


export const bibleDB = new BibleDB();
