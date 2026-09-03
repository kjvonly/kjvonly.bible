import {
  COMPLETED_READINGS,
  UNSYNCED_COMPLETED_READINGS
} from '$lib/domains/bible/persistence/bible.db';
import { bibleStorer } from '$lib/domains/bible/persistence/bible.storer';
import type { NostrEvent } from 'nostr-tools';
import { offlineApi } from './offline.api';
import { COMPLETED_READINGS_KIND } from './kinds';

export class CompletedReadingsApi {
  async put(data: any): Promise<any> {
    let unsyncedDB = UNSYNCED_COMPLETED_READINGS;
    let syncedDB = COMPLETED_READINGS;
    let event: NostrEvent = {
      kind: COMPLETED_READINGS_KIND,
      tags: [
        ["d", `kjvonly/completed-readings/${data.subID}/${data.index}`]
      ],
      content: '',
      created_at: 0,
      pubkey: '',
      id: '',
      sig: ''
    }
    return await offlineApi.put(event, data, unsyncedDB, syncedDB);
  }

  async gets(): Promise<any> {
    let data: any = undefined;
    try {
      let unsyncedCompletedReadings = await bibleStorer.getAllValue(
        UNSYNCED_COMPLETED_READINGS
      );
      let syncedCompletedReadings =
        await bibleStorer.getAllValue(COMPLETED_READINGS);

      let concatCompletedReadings: any = new Map();
      syncedCompletedReadings.forEach((p: any) => {
        concatCompletedReadings.set(p.id, p);
      });

      unsyncedCompletedReadings.forEach((p: any) => {
        concatCompletedReadings.set(p.id, p);
      });

      data = Array.from(concatCompletedReadings.values());
    } catch (error) {
      console.log(
        `error getting all completed readings from indexedDB: ${error}`
      );
    }
    return data;
  }

  async delete(subID: string, index: number): Promise<any> {
    let filter = {
      "#d": [`kjvonly/completed-readings/${subID}/${index}`]
    }

    await offlineApi.delete(id, filter, COMPLETED_READINGS_KIND, UNSYNCED_COMPLETED_READINGS, COMPLETED_READINGS);
  }
}

export let completedReadingsApi = new CompletedReadingsApi();
