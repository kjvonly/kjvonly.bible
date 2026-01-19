import { relayService } from '$lib/services/relay.service';
import { STRONGS } from '$lib/storer/bible.db';
import { KJVONLY_PUBKEY } from '$lib/utils/nostr';
import { offlineApi } from './offline.api';

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
