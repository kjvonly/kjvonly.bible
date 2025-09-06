import { CHAPTERS, BOOKNAMES, STRONGS, SEARCH } from '$lib/storer/bible.db';
import { sleep } from '$lib/utils/sleep';
import { bibleDB } from '$lib/storer/bible.db';
const syncWorker = new Worker(new URL('../workers/kjvsync.worker?worker', import.meta.url), {
	type: 'module'
});

/*
 * NOTE: github does not ungzip your files so we zcat them to .json on
 * build/deploy. do the same thing in your dev environment
 *
 *  for i in $(ls -1); do zcat $i > ${i%%.gz} ; done
 *  run this in the static/data/(json.gz|strongs.gz.gz) directories in
 *  your dev environment
 */
const TOTAL_CHAPTERS_KEYS = 1189;

/** BOOKNAMES is metadata on all bible chapters. */
const TOTAL_BOOKNAMES_KEYS = 1;

const TOTAL_STRONGS_KEYS = 14058;

export class SyncService {
	//todo unsubscribe
	subscribers: any[] = [];

	constructor() {
		syncWorker.onmessage = (e) => {
			this.subscribers.forEach((s) => {
				if (s.id === e.data.id) {
					s.fn(e.data);
				}
			});
		};
	}

	subscribe(id: any, fn: any) {
		this.subscribers.push({ id: id, fn: fn });
	}

	sync() {
		let token = localStorage.getItem('token');
		syncWorker.postMessage({
			action: 'sync',
			token: token
		});
	}

	async init() {
		await this.syncChapters();
		await this.syncBooknames();
		await this.syncStrongs();
		await this.syncSearchIndex();
	}

	// TODO update syncs to be generic.
	// implement a count call to index db to just return the count.
	async syncChapters() {
		let keys = await bibleDB.getAllKeys(CHAPTERS);
		if (keys.length < TOTAL_CHAPTERS_KEYS) {
			syncWorker.postMessage({ action: CHAPTERS });

			let retries = 0;
			let retryMax = 10;

			while (keys.length < TOTAL_CHAPTERS_KEYS || retries == retryMax) {
				await sleep(1000);
				keys = await bibleDB.getAllKeys(CHAPTERS);
				retries = retries + 1;
			}

			if (retries === retryMax) {
				return false;
			}
		}

		return true;
	}

	async syncBooknames() {
		let keys = await bibleDB.getAllKeys(BOOKNAMES);

		if (keys.length < TOTAL_BOOKNAMES_KEYS) {
			syncWorker.postMessage({ action: BOOKNAMES });

			let retries = 0;
			let retryMax = 10;

			while (keys.length < TOTAL_BOOKNAMES_KEYS || retries == retryMax) {
				await sleep(1000);
				keys = await bibleDB.getAllKeys(BOOKNAMES);
				retries = retries + 1;
			}

			if (retries === retryMax) {
				return false;
			}
		}

		return true;
	}

	async syncSearchIndex() {
		let searchIndex = await bibleDB.getValue(SEARCH, 'v1');

		if (!searchIndex) {
			syncWorker.postMessage({ action: SEARCH });

			let retries = 0;
			let retryMax = 10;

			while (!searchIndex || retries == retryMax) {
				await sleep(1000);
				searchIndex = await bibleDB.getValue(SEARCH, 'v1');
				retries = retries + 1;
			}

			if (retries === retryMax) {
				return false;
			}
		}

		return true;
	}

	async syncStrongs() {
		let keys = await bibleDB.getAllKeys(STRONGS);
		if (keys.length < TOTAL_STRONGS_KEYS) {
			syncWorker.postMessage({ action: STRONGS });

			let retries = 0;
			let retryMax = 10;

			while (keys.length < TOTAL_STRONGS_KEYS || retries == retryMax) {
				await sleep(1000);
				keys = await bibleDB.getAllKeys(STRONGS);
				retries = retries + 1;
			}

			if (retries === retryMax) {
				return false;
			}
		}

		return true;
	}
}

export let syncService = new SyncService();
