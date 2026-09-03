import {
  PERICOPES
} from '$lib/domains/bible/persistence/bible.db';

import { offlineApi } from './offline.nostr';
import { bibleLocationReferenceService } from '$lib/domains/bible/services/bibleLocationReference.service';

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

