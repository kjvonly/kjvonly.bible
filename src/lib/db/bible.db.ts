import { sleep } from '$lib/utils/sleep';
import IndexedDB from './idb.db';

export class BibleDB extends IndexedDB {
	instance: any;
	resolve: any;
	ready: Promise<boolean | undefined> = new Promise((resolve, reject) => {
		this.resolve = resolve;
	});
	isReady = false

	constructor() {
		super('bible');
		if (this.instance) {
			return this.instance;
		}
		this.instance = this;
	}

	async init() {
		/**
		 * This is called on app startup in +page.svelte.
		 *
		 * TODO - need to verify data was stored successfully
		 * 1. Crates indexdb chapters
		 * 2. if chapters not stored kickoff kjvdata.worker
		 * 3. verify data was loaded.
		 *
		 */

		let val = await this.createAndOrOpenObjectStore(['chapters']);

		if (!val) {
			return;
		}


		let v = await this.getValue('chapters', 'booknames');



		if (v === undefined) {
			let worker = new Worker(new URL('../workers/kjvdata.worker?worker', import.meta.url), {
				type: 'module'
			});
			worker.postMessage({});
		}

		let retries = 0;
		let retryMax = 10;

		while (v === undefined || retries == retryMax) {
			await sleep(1000);
			v = await this.getValue('chapters', 'booknames');
			retries = retries + 1;
		}

		if (retries === retryMax) {
			this.resolve(false);
			return;
		}
		this.resolve(true);
		this.isReady = true
	}
}

export const bibleDB = new BibleDB();
