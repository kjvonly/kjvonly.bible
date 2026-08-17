import { STRONGS } from '$lib/storer/bible.db';
import { offlineApi } from './offline.api';

export class StrongsApi {
	async get(key: string): Promise<any> {
		return offlineApi.cacheHitThenFetch(
			`/data/strongs.json.gz/${key}.json`,
			key,
			STRONGS,
			STRONGS
		);
	}
}

export let strongsApi = new StrongsApi();
