import { bibleStorer } from '$lib/domains/bible/persistence/bible.storer';
import { offlineApi } from './offline.nostr';
import { ANNOTATIONS, UNSYNCED_ANNOTATIONS } from '$lib/domains/bible/persistence/bible.db';
import { bibleLocationReferenceService } from '$lib/domains/bible/services/bibleLocationReference.service';
import type { NostrEvent } from 'nostr-tools';
import { ANNOTATIONS_KIND } from './kinds';
import type { Annotations } from '$lib/models/bible.model';

export class AnnotsApi {
  async getAnnotations(bibleLocationRef: string): Promise<any> {
    bibleLocationRef =
      bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef);
    let annotations = await offlineApi.cacheHit(
      bibleLocationRef,
      UNSYNCED_ANNOTATIONS,
      ANNOTATIONS
    );

    if (!annotations) {
      annotations = {
        id: bibleLocationRef,
        version: 0,
        annots: {}
      };
    }
    return annotations;
  }

  async putAnnotations(data: Annotations): Promise<any> {
    let unsyncedDB = UNSYNCED_ANNOTATIONS;
    let syncedDB = ANNOTATIONS;
    let event: NostrEvent = {
      kind: ANNOTATIONS_KIND,
      tags: [
        ["d", `kjvonly/annots/default/${data.id}`]
      ],
      content: '',
      created_at: 0,
      pubkey: '',
      id: '',
      sig: ''
    }
    return await offlineApi.put(event, data, unsyncedDB, syncedDB);
  }

  // TODO update import export
  async putAllAnnotations(objects: any): Promise<any> {
    try {
      await bibleStorer.putBulkValue(ANNOTATIONS, objects);
    } catch (error) {
      console.log(`error importing all annotations from indexedDB: ${error}`);
    }
  }

  async getAllAnnotations(): Promise<any> {
    // TODO - GET UNSYNCED DATA
    let data: any = undefined;
    try {
      data = await bibleStorer.getAllValue(ANNOTATIONS);
    } catch (error) {
      console.log(`error getting all annotations from indexedDB: ${error}`);
    }
    return data;
  }
}

export let annotsApi = new AnnotsApi();
