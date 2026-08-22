import { STRONGS } from '$lib/domains/bible/persistence/bible.db';
import { KJVONLY_PUBKEY } from '$lib/infrastructure/nostr/nostr';
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
