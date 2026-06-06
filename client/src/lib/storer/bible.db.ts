import IndexedDB from './idb.db';

const DB_VERSION = 15;

export const enum STORES {
  CHAPTERS,
  BIBLE_VERSIONS,
  PARAGRAPHS,
  PERICOPES,
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
}

export const DB_NAME = 'bible';

// indexes 
export const CHAPTERS = 'chapters';
export const BIBLE_VERSIONS = 'bible_versions';
export const PARAGRAPHS = 'paragraphs'
export const PERICOPES = 'pericopes'
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

export const COMPLETED_READINGS = 'completed_readings';
export const UNSYNCED_COMPLETED_READINGS = 'unsynced_completed_readings';

// ACTIONS

export const ACTION_DELETE_VERSION = 'DELETE_VERSION'

export class BibleDB extends IndexedDB {
  constructor() {
    super(DB_NAME);
  }

  static instance: BibleDB = new BibleDB();
  public static async CreateAsync(): Promise<BibleDB> {
    await this.instance.createAndOrOpenObjectStores(
      [
        CHAPTERS,
        BIBLE_VERSIONS,
        PARAGRAPHS,
        PERICOPES,
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

        COMPLETED_READINGS,
        UNSYNCED_COMPLETED_READINGS
      ],
      DB_VERSION
    );
    return this.instance;
  }
}

export const bibleDB = await BibleDB.CreateAsync();
