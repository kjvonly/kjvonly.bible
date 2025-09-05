import { 
	PLANS, 
	UNSYNCED_PLANS,
	PLAN_SUBSCRIPTIONS,
	UNSYNCED_PLAN_SUBSCRIPTIONS,
	PLAN_TRACKER,
	UNSYNCED_PLAN_TRACKER
 } from '$lib/storer/bible.db';
import { bibleStorer } from '$lib/storer/bible.storer';
import { offlineApi } from './offline.api';

export class PlansApi {
	async putPlan(data: any): Promise<any> {
		let path = '/plans';
		return offlineApi.put(data, path, UNSYNCED_PLANS, PLANS);
	}

	async getAllPlans(): Promise<any> {
		let data: any = undefined;
		try {
			let unsyncedPlans = await bibleStorer.getAllValue(UNSYNCED_PLANS);
			let syncedPlans = await bibleStorer.getAllValue(PLANS);

			let concatPlans: any = new Map()
			syncedPlans.forEach((p: any)=> {
				concatPlans.append(p.id, p)
			})

			unsyncedPlans.forEach((p: any)=> {
				concatPlans.append(p.id, p)
			})

			data = Array.from(concatPlans.values());

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

		async putSubscription(data: any): Promise<any> {
		let path = '/plans/<planID>/subs/<subid>/track';
		return offlineApi.put(data, path, UNSYNCED_PLAN_SUBSCRIPTIONS, PLAN_SUBSCRIPTIONS);
	}

	async getAllSubscriptions(): Promise<any> {
		let data: any = undefined;
		try {
			let unsyncedSubscription = await bibleStorer.getAllValue(UNSYNCED_PLAN_SUBSCRIPTIONS);
			let syncedSubscriptions = await bibleStorer.getAllValue(PLAN_SUBSCRIPTIONS);

			let concatSubscription: any = new Map()
			syncedSubscriptions.forEach((p: any)=> {
				concatSubscription.append(p.id, p)
			})

			unsyncedSubscription.forEach((p: any)=> {
				concatSubscription.append(p.id, p)
			})

			data = Array.from(concatSubscription.values());
			
		} catch (error) {
			console.log(`error getting all subscriptions from indexedDB: ${error}`);
		}
		return data;
	}

	async deleteSubscription(noteID: string): Promise<any> {
		let path: string = `/plans`;
		let delNte = {
			id: noteID,
			dateDeleted: Date.now()
		};
		await offlineApi.delete(delNte, path, UNSYNCED_PLANS, PLANS);
	}
}

export let plansApi = new PlansApi();
