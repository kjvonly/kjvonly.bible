import { bibleStorer } from '$lib/storer/bible.storer';

import {
  CHAPTERS,
  BOOKNAMES,
  SEARCH,
  STRONGS
} from '$lib/storer/bible.db';

import { offlineApi } from './offline.nostr';
import { bibleLocationReferenceService } from '$lib/services/bible/bibleLocationReference.service';
import { KJVONLY_PUBKEY } from '$lib/utils/nostr';
import { relayService } from '$lib/nostr/services/relay.service';

export class ChapterApi {
  async getChapter(key: string): Promise<any> {

    let bibleLocationRef = ''
    let versionRef = key.split('/')
    if (versionRef.length === 2) {
      bibleLocationRef = versionRef[1]
    }

    bibleLocationRef =
      bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef);

    let filter = {
      "authors": [KJVONLY_PUBKEY],
      "#d": [`kjvonly/bible/kjvs/${bibleLocationRef}`]
    }


    return offlineApi.cacheHitThenFetch(
      filter,
      key,
      CHAPTERS,
      CHAPTERS
    );
  }

  async getBooknames(): Promise<any> {
    let filter = {
      "authors": [KJVONLY_PUBKEY],
      "#d": [`kjvs/booknames.json.gz.hex`]
    }

    return offlineApi.cacheHitThenFetch(
      filter,
      BOOKNAMES,
      BOOKNAMES,
      BOOKNAMES
    );
  }

  async getSearchIndex(): Promise<any> {
    // return offlineApi.cacheHitThenFetch(
    //   `/data/json.gz/bibleindex.json`,
    //   'v1',
    //   SEARCH,
    //   SEARCH
    // );
  }

  async getStrongs(key: string): Promise<any> {
    let filter = {
      "authors": [KJVONLY_PUBKEY],
      "#d": [`kjvonly/bible/strongs/{key}`]
    }

    let content = await relayService.getContent(filter)
    return JSON.parse(content)


    return offlineApi.cacheHitThenFetch(
      filter,
      key,
      STRONGS,
      STRONGS
    );
  }
}

export let chapterApi = new ChapterApi();
