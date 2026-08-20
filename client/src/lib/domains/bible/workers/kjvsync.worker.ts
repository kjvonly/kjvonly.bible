import { api } from '$lib/nostr/events/api';
import {
  BibleDB,
  ANNOTATIONS,
  UNSYNCED_ANNOTATIONS,
  NOTES,
  UNSYNCED_NOTES,
  CHAPTERS,
  BOOKNAMES,
  SEARCH,
  STRONGS,
  PARAGRAPHS,
  PERICOPES,
  BIBLE_VERSIONS,
  ACTION_DELETE_VERSION,
  getBibleDB
} from '$lib/domains/bible/persistence/bible.db';
import { authService } from '$lib/application/services/auth.service';
import { offlineApi } from '$lib/nostr/events/offline.nostr';
import { downloadAndDecompressGzip } from '$lib/utils/gzip';

let bibleDB = await getBibleDB()

onmessage = async (e) => {
  switch (e.data.action) {
    // case 'init':
    //   await syncAnnotsAndNotesFromServer(e.data);
    //   break;
    // case 'sync':
    //   await syncAnnotsAndNotesFromServer(e.data);
    //   break;
    case 'chapters':
      fetchAndStoreAllBibleChapters(e.data.urls);
      break;
    case 'paragraphs':
      fetchAndStoreAllParagraphs(e.data.urls);
      break;
    case 'pericopes':
      fetchAndStoreAllPericopes(e.data.urls);
      break;
    case 'booknames':
      fetchAndStoreBooknames(e.data.urls);
      break;
    case 'strongs':
      fetchAndStoreStrongsDefs(e.data.urls);
      break;
    case 'search':
      fetchAndStoreSearchBibleIndex(e.data.urls);
    case ACTION_DELETE_VERSION:
      deleteVersion(e.data.version)
      break;
  }
};

//let db = await BibleDB.CreateAsync();
let db = bibleDB

// // TODO sync ANNOTS and NOTES
// async function syncAnnotsAndNotesFromServer(data: any) {
//   authService.setBearerToekn(data.token);

//   // ----------------- SYNC ANNOTS ------------------------------------------
//   await offlineApi.sync('/annots', UNSYNCED_ANNOTATIONS, ANNOTATIONS);
//   postMessage({ id: 'annotations' });

//   // ----------------- SYNC NOTES -------------------------------------------
//   await offlineApi.sync('/notes', UNSYNCED_NOTES, NOTES);
//   postMessage({ id: 'notes' });
// }

// --------------------- SYNC STATIC DATA -------------------------------------

async function fetchAndStoreAllBibleChapters(urls: string[]) {
  for (let u of urls) {
    try {
      let json = ''
      if (u.endsWith('.gz')) {
        json = await downloadAndDecompressGzip(u)
      } else {
        throw new Error(`can only process gzip for chapters but got ${u}`)
      }

      // Loop through all chapters by key (bibleLocationRef)
      // and add chapter to chapters to Chapters indexedDB
      let chapters = new Map<string, any>(Object.entries(JSON.parse(json)));
      chapters.forEach((chapter: any, bibleLocationRef: string) => {
        chapter['id'] = bibleLocationRef;
        db.putValue(CHAPTERS, chapter);
      });

      // Add bible version to bible versions table to track what bible versions
      // the user has installed on device.
      let key = chapters.keys().next().value
      let bibleVersion = key?.split('/')[0]
      await db.putValue(BIBLE_VERSIONS, { id: bibleVersion })
      return
    } catch (err) {
      console.log(`error: ${err}`);
    }
  }
}

async function deleteVersion(version: string): Promise<void> {
  await bibleDB.deleteValue(BIBLE_VERSIONS, version)
  await deleteVersionChapters(version)
}

async function deleteVersionChapters(version: string): Promise<void> {
  let keys = await bibleDB.getAllKeys(CHAPTERS)
  let versionKeys = keys.map(key => key as string).filter((key: string) => key.startsWith(`${version}/`))
  for (const key of versionKeys) {
    await bibleDB.deleteValue(CHAPTERS, key)
  }
}

async function fetchAndStoreAllParagraphs(urls: string[]) {
  for (let u of urls) {
    try {
      let json = ''
      if (u.endsWith('.gz')) {
        json = await downloadAndDecompressGzip(u)
      } else {
        throw new Error(`can only process gzip for paragraphs but got ${u}`)
      }
      let chapters = new Map<string, any>(Object.entries(JSON.parse(json)));
      chapters.forEach((chapter: any, bibleLocationRef: string) => {
        if (chapter === null) {
          chapter = {}
        }
        chapter['id'] = bibleLocationRef;
        db.putValue(PARAGRAPHS, chapter);
      });
      return
    } catch (err) {
      console.log(`error: ${err}`);
    }
  }
}

async function fetchAndStoreAllPericopes(urls: string[]) {
  for (let u of urls) {
    try {
      let json = ''
      if (u.endsWith('.gz')) {
        json = await downloadAndDecompressGzip(u)
      } else {
        throw new Error(`can only process gzip for pericopes but got ${u}`)
      }
      let chapters = new Map<string, any>(Object.entries(JSON.parse(json)));
      chapters.forEach((chapter: any, bibleLocationRef: string) => {
        if (chapter === null) {
          chapter = {}
        }
        chapter['id'] = bibleLocationRef;
        db.putValue(PERICOPES, chapter);
      });
      return
    } catch (err) {
      console.log(`error: ${err}`);
    }
  }
}

async function fetchAndStoreBooknames(urls: string[]) {

  for (let u of urls) {
    try {
      let json = ''
      if (u.endsWith('.gz')) {
        json = await downloadAndDecompressGzip(u)
      } else {
        throw new Error(`can only process gzip for booknames but got ${u}`)
      }
      let data = JSON.parse(json)
      data['id'] = BOOKNAMES;
      db.putValue(BOOKNAMES, data);
    } catch (err) {
      console.log(`error: ${err}`);
    }
  }
}

async function fetchAndStoreSearchBibleIndex(urls: string[]) {
  for (let u of urls) {
    try {
      let json = ''
      if (u.endsWith('.gz')) {
        json = await downloadAndDecompressGzip(u)
      } else {
        throw new Error(`can only process gzip bibleindex but got ${u}`)
      }
      let data = JSON.parse(json)

      db.putValue(SEARCH, data);
    } catch (err) {
      console.log(`error: ${err}`);
    }
  }
}

async function fetchAndStoreStrongsDefs(urls: string[]) {
  for (let u of urls) {
    try {
      let json = ''
      if (u.endsWith('.gz')) {
        json = await downloadAndDecompressGzip(u)
      } else {
        throw new Error(`can only process gzip for strongs but got ${u}`)
      }
      let data = JSON.parse(json)

      let defs = new Map<string, any>(Object.entries(data));
      defs.forEach((def: any, key: string) => {
        def['id'] = key;
        db.putValue(STRONGS, def);
      });
    } catch (err) {
      console.log(`error: ${err}`);
    }
  }
}
