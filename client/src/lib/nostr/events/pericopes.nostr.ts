import {
  PERICOPES
} from '$lib/storer/bible.db';

import { offlineApi } from './offline.nostr';
import { bibleLocationReferenceService } from '$lib/services/bible/bibleLocationReference.service';

export class PericopesApi {
  async get(bibleLocationRef: string): Promise<any> {
    bibleLocationRef =
      bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef);


    return offlineApi.cacheHit(
      bibleLocationRef,
      PERICOPES,
      PERICOPES
    );
  }

}

export let pericopesApi = new PericopesApi()

