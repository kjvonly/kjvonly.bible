import {
	COMPLETED_READINGS,
	UNSYNCED_COMPLETED_READINGS
} from '$lib/storer/bible.db';
import { bibleStorer } from '$lib/storer/bible.storer';
import { offlineApi } from './offline.api';

const PATH = '/completed-readings';
export class CompletedReadingsApi {
	async put(data: any): Promise<any> {
		return await offlineApi.put(
			data,
			PATH,
			UNSYNCED_COMPLETED_READINGS,
			COMPLETED_READINGS
		);
	}

	async gets(): Promise<any> {
		let data: any = undefined;
		try {
			let unsyncedCompletedReadings = await bibleStorer.getAllValue(
				UNSYNCED_COMPLETED_READINGS
			);
			let syncedCompletedReadings =
				await bibleStorer.getAllValue(COMPLETED_READINGS);

			let concatCompletedReadings: any = new Map();
			syncedCompletedReadings.forEach((p: any) => {
				concatCompletedReadings.set(p.id, p);
			});

			unsyncedCompletedReadings.forEach((p: any) => {
				concatCompletedReadings.set(p.id, p);
			});

			data = Array.from(concatCompletedReadings.values());
		} catch (error) {
			console.log(
				`error getting all completed readings from indexedDB: ${error}`
			);
		}
		return data;
	}

	async delete(id: string): Promise<any> {
		await offlineApi.delete(
			id,
			PATH,
			UNSYNCED_COMPLETED_READINGS,
			COMPLETED_READINGS
		);
	}
}

export let completedReadingsApi = new CompletedReadingsApi();
