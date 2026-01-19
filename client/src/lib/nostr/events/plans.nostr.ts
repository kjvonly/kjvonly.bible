import { PLANS, UNSYNCED_PLANS } from '$lib/storer/bible.db';
import { bibleStorer } from '$lib/storer/bible.storer';
import type { NostrEvent } from 'nostr-tools';
import { offlineApi } from './offline.api';
import { PLANS_KIND } from './kinds';
import { relayService } from '$lib/services/relay.service';
import { KJVONLY_PUBKEY } from '$lib/utils/nostr';

export class PlansApi {
  async put(data: any): Promise<any> {
    let unsyncedDB = UNSYNCED_PLANS;
    let syncedDB = PLANS;
    let event: NostrEvent = {
      kind: PLANS_KIND,
      tags: [
        ["d", `kjvonly/plans/readings/${data.id}`]
      ],
      content: '',
      created_at: 0,
      pubkey: '',
      id: '',
      sig: ''
    }
    return await offlineApi.put(event, data, unsyncedDB, syncedDB);
  }

  async get(key: string): Promise<any> {
    return offlineApi.cacheHit(key, UNSYNCED_PLANS, PLANS);
  }

  async gets(): Promise<any> {
    let data: any = undefined;
    try {
      let unsyncedPlans = await bibleStorer.getAllValue(UNSYNCED_PLANS);
      let syncedPlans = await bibleStorer.getAllValue(PLANS);

      let concatPlans: any = new Map();
      syncedPlans.forEach((p: any) => {
        concatPlans.set(p.id, p);
      });

      unsyncedPlans.forEach((p: any) => {
        concatPlans.set(p.id, p);
      });

      data = Array.from(concatPlans.values());
    } catch (error) {
      console.log(`error getting all plans from indexedDB: ${error}`);
    }
    return data;
  }

  // TODO need to create data structure for this to have
  // author/relay info for followers.
  async getPlansFromPeopleYouFollow(): Promise<any> {
    let filter = {
      "authors": [`${KJVONLY_PUBKEY}`],
      "kinds": [PLANS_KIND],
    }
    let contents = await relayService.getContents(filter)
    let plans = []
    for (let c of contents) {
      let plan = JSON.parse(c)
      plans.push(plan)
    }
    return plans
  }

  async delete(id: string): Promise<any> {
    let filter = {
      "#d": [`kjvonly/plans/readings/${id}`]
    }

    await offlineApi.delete(id, filter, PLANS_KIND, UNSYNCED_PLANS, PLANS);
  }

}

export let plansApi = new PlansApi();
