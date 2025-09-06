import IndexedDB from './idb.db';

const DB_VERSION = 9

export const enum STORES {
	CHAPTERS,
	BOOKNAMES,
	STRONGS,
	SEARCH,
	ANNOTATIONS,
	UNSYNCED_ANNOTATIONS,
	NOTES,
	UNSYNCED_NOTES,
	PLANS,
	UNSYNCED_PLANS,
	SUBSCRIPTIONS,
	UNSYNCED_SUBSCRIPTIONS,
	READINGS,
	UNSYNCED_READINGS,
}

export const DB_NAME = 'bible';

export const CHAPTERS = 'chapters';
export const BOOKNAMES = 'booknames';
export const STRONGS = 'strongs';
export const SEARCH = 'search';

export const ANNOTATIONS = 'annotations';
export const UNSYNCED_ANNOTATIONS = 'unsynced_annotations';

export const NOTES = 'notes';
export const UNSYNCED_NOTES = 'unsynced_notes';

export const PLANS = 'plans';
export const UNSYNCED_PLANS = 'unsynced_plans';

export const SUBSCRIPTIONS = 'subscriptions';
export const UNSYNCED_SUBSCRIPTIONS = 'unsynced_subscriptions';

export const READINGS = 'readings';
export const UNSYNCED_READINGS = 'readings';


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
			SEARCH,

			ANNOTATIONS,
			UNSYNCED_ANNOTATIONS,
			
			NOTES,
			UNSYNCED_NOTES,

			PLANS,
			UNSYNCED_PLANS,

			SUBSCRIPTIONS,
			UNSYNCED_SUBSCRIPTIONS,

			READINGS,
			UNSYNCED_READINGS
		], DB_VERSION);
		return this.instance;
	}
}

export const bibleDB = await BibleDB.CreateAsync();
