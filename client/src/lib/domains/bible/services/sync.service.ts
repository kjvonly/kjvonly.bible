import { CHAPTERS, BOOKNAMES, STRONGS, SEARCH, PARAGRAPHS, PERICOPES, ACTION_DELETE_VERSION, getBibleDB } from '$lib/domains/bible/persistence/bible.db';
import { sleep } from '$lib/infrastructure/utils/sleep';
import { relayService } from '../../../nostr/services/relay.service';
import { MANIFEST_KIND } from '$lib/nostr/events/kinds';
import { getTag, getTags, KJVONLY_PUBKEY } from '$lib/infrastructure/nostr/nostr';

let bibleDB = await getBibleDB()


const syncWorker = new Worker(
  new URL('../workers/kjvsync.worker?worker', import.meta.url),
  {
    type: 'module'
  }
);

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

  unsubscribe(subID: any) {
    let tmpSubscribers: any = [];
    this.subscribers.forEach((s) => {
      if (s.subID !== subID) {
        tmpSubscribers.push();
      }
    });
    this.subscribers = tmpSubscribers;
  }
  subscribe(subID: string, id: any, fn: any) {
    this.subscribers.push({ subID: subID, id: id, fn: fn });
  }

  sync() {
    let token = localStorage.getItem('token');
    syncWorker.postMessage({
      action: 'sync',
      token: token
    });
  }

  async init(): Promise<void> {
    await this.syncChapters();
    await this.syncBooknames();
    await this.syncStrongs();
    await this.syncSearchIndex();
    await this.syncParagraphs();
    await this.syncPericopes();
  }

  // TODO update syncs to be generic.
  // implement a count call to index db to just return the count.
  async syncChapters() {
    let keys = await bibleDB.getAllKeys(CHAPTERS);
    if (keys.length === 0 || keys.length % TOTAL_CHAPTERS_KEYS !== 0) {
      let filter = {
        "authors": [KJVONLY_PUBKEY],
        kinds: [MANIFEST_KIND]
      }

      let events = await relayService.getEvents(filter)
      events?.forEach(event => {
        let type = getTag(event, 'type')
        if (type === 'chapters') {
          let urls = getTags(event, 'url')
          syncWorker.postMessage({ action: CHAPTERS, urls: urls });
        }
      })

      let retries = 0;
      let retryMax = 10;

      while (keys.length < TOTAL_CHAPTERS_KEYS || retries == retryMax) {
        await sleep(3000);
        keys = await bibleDB.getAllKeys(CHAPTERS);
        retries = retries + 1;
      }

      if (retries === retryMax) {
        return false;
      }
    }

    return true;
  }

  async deleteVersion(version: string) {
    syncWorker.postMessage({ action: ACTION_DELETE_VERSION, version: version })
  }

  async syncParagraphs() {
    let keys = await bibleDB.getAllKeys(PARAGRAPHS);
    if (keys.length < TOTAL_CHAPTERS_KEYS) {
      let filter = {
        "#d": [`kjvonly/bible/kjvs/paragraphs`],
        "authors": [KJVONLY_PUBKEY],
        kinds: [MANIFEST_KIND]

      }

      let event = await relayService.getEvent(filter)
      let urls = getTags(event, 'url')
      syncWorker.postMessage({ action: PARAGRAPHS, urls: urls });

      let retries = 0;
      let retryMax = 10;

      while (keys.length < TOTAL_CHAPTERS_KEYS || retries == retryMax) {
        await sleep(3000);
        keys = await bibleDB.getAllKeys(PARAGRAPHS);
        retries = retries + 1;
      }

      if (retries === retryMax) {
        return false;
      }
    }

    return true;
  }

  async syncPericopes() {
    let keys = await bibleDB.getAllKeys(PERICOPES);
    if (keys.length < TOTAL_CHAPTERS_KEYS) {
      let filter = {
        "#d": [`kjvonly/bible/kjvs/pericopes`],
        "authors": [KJVONLY_PUBKEY],
        kinds: [MANIFEST_KIND]
      }

      let event = await relayService.getEvent(filter)
      let urls = getTags(event, 'url')
      syncWorker.postMessage({ action: PERICOPES, urls: urls });

      let retries = 0;
      let retryMax = 10;

      while (keys.length < TOTAL_CHAPTERS_KEYS || retries == retryMax) {
        await sleep(3000);
        keys = await bibleDB.getAllKeys(PERICOPES);
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
      let filter = {
        "#d": [`kjvonly/bible/kjvs/booknames`],
        "authors": [KJVONLY_PUBKEY],
        kinds: [MANIFEST_KIND]
      }

      let event = await relayService.getEvent(filter)
      if (event) {
        let urls = getTags(event, 'url')
        syncWorker.postMessage({ action: BOOKNAMES, urls: urls });
      }

      let retries = 0;
      let retryMax = 10;

      while (keys.length < TOTAL_BOOKNAMES_KEYS || retries == retryMax) {
        await sleep(3000);
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
      let filter = {
        "#d": [`kjvonly/bible/kjvs/bibleindex`],
        "authors": [KJVONLY_PUBKEY],
        kinds: [MANIFEST_KIND]
      }

      let event = await relayService.getEvent(filter)
      if (event) {
        let urls = getTags(event, 'url')
        syncWorker.postMessage({ action: SEARCH, urls: urls });
      }

      let retries = 0;
      let retryMax = 10;

      while (!searchIndex || retries == retryMax) {
        await sleep(3000);
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
      let filter = {
        "#d": [`kjvonly/bible/strongs/all`],
        "authors": [KJVONLY_PUBKEY],
        kinds: [MANIFEST_KIND]
      }

      let event = await relayService.getEvent(filter)
      if (event) {
        let urls = getTags(event, 'url')
        syncWorker.postMessage({ action: STRONGS, urls: urls });
      }

      let retries = 0;
      let retryMax = 10;

      while (keys.length < TOTAL_STRONGS_KEYS || retries == retryMax) {
        await sleep(3000);
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
