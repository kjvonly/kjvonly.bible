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

export const DB_NAME = 'bible';
export const CHAPTERS = 'chapters';
export const BOOKNAMES = 'booknames';
export const STRONGS = 'strongs';
export const ANNOTATIONS = 'annotations';
export const NOTES = 'notes';
export const SEARCH = 'search';
export const UNSYNCED_ANNOTATIONS = 'unsynced_annotations';
export const UNSYNCED_NOTES = 'unsynced_notes';

export class BibleDB extends IndexedDB {
	constructor() {
		super(DB_NAME);
	}

	static instance = new BibleDB();
	public static async CreateAsync(): Promise<BibleDB> {
		await this.instance.createAndOrOpenObjectStores([
			CHAPTERS,
			BOOKNAMES,
			STRONGS,
			ANNOTATIONS,
			NOTES,
			SEARCH,
			UNSYNCED_ANNOTATIONS,
			UNSYNCED_NOTES
		]);
		return this.instance;
	}
}

export const bibleDB = await BibleDB.CreateAsync();
