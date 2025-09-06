import {
	SUBSCRIPTIONS,
	UNSYNCED_SUBSCRIPTIONS,
} from '$lib/storer/bible.db';
import { bibleStorer } from '$lib/storer/bible.storer';
import { offlineApi } from './offline.api';

const PATH = '/subs'

export class SubscriptionsApi {

	async put(data: any): Promise<any> {
		return offlineApi.put(data, PATH, UNSYNCED_SUBSCRIPTIONS, SUBSCRIPTIONS);
	}

	async gets(): Promise<any> {
		let data: any = undefined;
		try {
			let unsyncedSubscription = await bibleStorer.getAllValue(UNSYNCED_SUBSCRIPTIONS);
			let syncedSubscriptions = await bibleStorer.getAllValue(SUBSCRIPTIONS);

			let concatSubscription: any = new Map()
			syncedSubscriptions.forEach((p: any) => {
				concatSubscription.append(p.id, p)
			})

			unsyncedSubscription.forEach((p: any) => {
				concatSubscription.append(p.id, p)
			})

			data = Array.from(concatSubscription.values());

		} catch (error) {
			console.log(`error getting all subscriptions from indexedDB: ${error}`);
		}
		return data;
	}

	async delete(id: string): Promise<any> {
			await offlineApi.delete(id, PATH, UNSYNCED_SUBSCRIPTIONS, SUBSCRIPTIONS);
	}
}

export let subsApi = new SubscriptionsApi();
