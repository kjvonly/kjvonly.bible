import {
  PARAGRAPHS
} from '$lib/storer/bible.db';

import { offlineApi } from './offline.nostr';
import { bibleLocationReferenceService } from '$lib/services/bible/bibleLocationReference.service';

export class ParagraphsApi {
  async get(bibleLocationRef: string): Promise<any> {
    bibleLocationRef =
      bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef);


    return offlineApi.cacheHit(
      bibleLocationRef,
      PARAGRAPHS,
      PARAGRAPHS
    );
  }

}

export let paragraphsApi = new ParagraphsApi()

