import { SUBSCRIPTIONS, UNSYNCED_SUBSCRIPTIONS } from '$lib/storer/bible.db';
import { bibleStorer } from '$lib/storer/bible.storer';
import type { NostrEvent } from 'nostr-tools';
import { offlineApi } from './offline.nostr';
import { SUBSCRIPTIONS_KIND } from './kinds';

export class SubscriptionsApi {
  async put(data: any): Promise<any> {
    let unsyncedDB = UNSYNCED_SUBSCRIPTIONS;
    let syncedDB = SUBSCRIPTIONS;
    let event: NostrEvent = {
      kind: SUBSCRIPTIONS_KIND,
      tags: [
        ["d", `kjvonly/subs/default/${data.id}`]
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
      let unsyncedSubscription = await bibleStorer.getAllValue(
        UNSYNCED_SUBSCRIPTIONS
      );
      let syncedSubscriptions = await bibleStorer.getAllValue(SUBSCRIPTIONS);

      let concatSubscription: any = new Map();
      syncedSubscriptions.forEach((p: any) => {
        concatSubscription.set(p.id, p);
      });

      unsyncedSubscription.forEach((p: any) => {
        concatSubscription.set(p.id, p);
      });

      data = Array.from(concatSubscription.values());
    } catch (error) {
      console.log(`error getting all subscriptions from indexedDB: ${error}`);
    }
    return data;
  }

  // TODO deleting subscription should also delete all completedReadings 
  async delete(id: string): Promise<any> {
    let filter = {
      "#d": [`kjvonly/subs/default/${id}`]
    }

    await offlineApi.delete(id, filter, SUBSCRIPTIONS_KIND, UNSYNCED_SUBSCRIPTIONS, SUBSCRIPTIONS);
  }

}

export let subsApi = new SubscriptionsApi();
