import { PLANS, UNSYNCED_PLANS } from '$lib/storer/bible.db';
import { bibleStorer } from '$lib/storer/bible.storer';
import { offlineApi } from './offline.api';

export class PlansApi {
	async putNote(data: any): Promise<any> {
		let path = '/plans';
		let unsyncedDB = UNSYNCED_PLANS;
		let syncedDB = PLANS;
		return offlineApi.put(data, path, unsyncedDB, syncedDB);
	}

	async getAllPlans(): Promise<any> {
		let data: any = undefined;
		try {
			data = await bibleStorer.getAllValue(PLANS);
		} catch (error) {
			console.log(`error getting all plans from indexedDB: ${error}`);
		}
		return data;
	}

	async deletePlan(noteID: string): Promise<any> {
		let path: string = `/plans`;
		let delNte = {
			id: noteID,
			dateDeleted: Date.now()
		};
		await offlineApi.delete(delNte, path, UNSYNCED_PLANS, PLANS);
	}
}

export let plansApi = new PlansApi();
