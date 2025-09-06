import {
	PLANS,
	UNSYNCED_PLANS
} from '$lib/storer/bible.db';
import { bibleStorer } from '$lib/storer/bible.storer';
import { offlineApi } from './offline.api';

const PATH = '/plans'

export class PlansApi {
	
	async put(data: any): Promise<any> {
		return offlineApi.put(data, PATH, UNSYNCED_PLANS, PLANS);
	}

	async gets(): Promise<any> {
		let data: any = undefined;
		try {
			let unsyncedPlans = await bibleStorer.getAllValue(UNSYNCED_PLANS);
			let syncedPlans = await bibleStorer.getAllValue(PLANS);

			let concatPlans: any = new Map()
			syncedPlans.forEach((p: any) => {
				concatPlans.append(p.id, p)
			})

			unsyncedPlans.forEach((p: any) => {
				concatPlans.append(p.id, p)
			})

			data = Array.from(concatPlans.values());

		} catch (error) {
			console.log(`error getting all plans from indexedDB: ${error}`);
		}
		return data;
	}

	async delete(id: string): Promise<any> {

		await offlineApi.delete(id, PATH, UNSYNCED_PLANS, PLANS);
	}
}

export let plansApi = new PlansApi();
