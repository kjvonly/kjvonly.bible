import {
  PARAGRAPHS
} from '$lib/domains/bible/persistence/bible.db';

import { offlineApi } from './offline.nostr';
import { bibleLocationReferenceService } from '$lib/domains/bible/services/bibleLocationReference.service';

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

