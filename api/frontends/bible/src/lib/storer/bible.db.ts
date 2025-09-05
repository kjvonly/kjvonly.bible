import IndexedDB from './idb.db';

const DB_VERSION = 8

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
	PLAN_SUBSCRIPTIONS,
	UNSYNCED_PLAN_SUBSCRIPTIONS,
	PLAN_TRACKER,
	UNSYNCED_PLAN_TRACKER,
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

export const PLAN_SUBSCRIPTIONS = 'plan_subscription';
export const UNSYNCED_PLAN_SUBSCRIPTIONS = 'unsynced_plan_subscription';

export const PLAN_TRACKER = 'plan_tracker';
export const UNSYNCED_PLAN_TRACKER = 'unsynced_plan_tracker';


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

			PLAN_SUBSCRIPTIONS,
			UNSYNCED_PLAN_SUBSCRIPTIONS,

			PLAN_TRACKER,
			UNSYNCED_PLAN_TRACKER
		], DB_VERSION);
		return this.instance;
	}
}

export const bibleDB = await BibleDB.CreateAsync();
