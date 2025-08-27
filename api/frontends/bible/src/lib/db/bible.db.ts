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
	constructor() {
		super(DB_NAME);
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
