import uuid4 from 'uuid4';
import IndexedDB from '$lib/infrastructure/persistence/idb.db';

const DB_VERSION = 17;




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


  // NOSTR IMPLE
  RESOURCE_INSTALLATIONS
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

// // NOSTR 
export const RESOURCE_INSTALLATIONS = 'resource_installations';

// ACTIONS

export const ACTION_DELETE_VERSION = 'DELETE_VERSION'

let bibleDBPromise: Promise<BibleDB> | null = null;

export function getBibleDB(): Promise<BibleDB> {
  if (!bibleDBPromise) {
    bibleDBPromise = BibleDB.CreateAsync();
  }

  return bibleDBPromise;
}

export class BibleDB extends IndexedDB {
  constructor() {
    super(DB_NAME);
  }

  static instance: BibleDB = new BibleDB();

  private static createPromise: Promise<BibleDB> | null = null;

  public static async CreateAsync(): Promise<BibleDB> {
    if (this.createPromise) {
      return this.createPromise;
    }

    this.createPromise = (async () => {
      await this.instance.createAndOrOpenObjectStores([
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

        RESOURCE_INSTALLATIONS,
      ],
        DB_VERSION);

      return this.instance;
    })();

    return this.createPromise;
  }
}