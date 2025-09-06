import { NOTES, UNSYNCED_NOTES } from '$lib/storer/bible.db';
import { bibleStorer } from '$lib/storer/bible.storer';
import { offlineApi } from './offline.api';

const PATH = 'notes'
export class NotesApi {

	async put(data: any): Promise<any> {
		let unsyncedDB = UNSYNCED_NOTES;
		let syncedDB = NOTES;
		return offlineApi.put(data, PATH, unsyncedDB, syncedDB);
	}

	async gets(): Promise<any> {
        // TODO READ from unsycneddb as well
        // look at Plans api
		let data: any = undefined;
		try {
			data = await bibleStorer.getAllValue(NOTES);
		} catch (error) {
			console.log(`error getting all annotations from indexedDB: ${error}`);
		}
		return data;
	}

	async delete(id: string): Promise<any> {
		await offlineApi.delete(id, PATH, UNSYNCED_NOTES, NOTES);
	}

}

export let notesApi = new NotesApi();
