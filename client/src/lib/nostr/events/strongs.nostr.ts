import { STRONGS } from '$lib/storer/bible.db';
import { KJVONLY_PUBKEY } from '$lib/utils/nostr';
import { offlineApi } from './offline.nostr';

export class StrongsApi {

  async get(ref: string): Promise<any> {
    let filter = {
      "authors": [KJVONLY_PUBKEY],
      "#d": [`kjvonly/bible/strongs/${ref}`]
    }

    return offlineApi.cacheHitThenFetch(
      filter,
      ref,
      STRONGS,
      STRONGS
    );
  }
}



export let strongsApi = new StrongsApi();
