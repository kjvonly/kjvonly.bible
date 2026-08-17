import { NOTES, UNSYNCED_NOTES } from '$lib/storer/bible.db';
import { bibleStorer } from '$lib/storer/bible.storer';
import { deepMerge } from '$lib/utils/deepmerge';
import { offlineApi } from './offline.api';

const PATH = 'notes';
export class NotesApi {
	async put(data: any): Promise<any> {
		let unsyncedDB = UNSYNCED_NOTES;
		let syncedDB = NOTES;
		return offlineApi.put(data, PATH, unsyncedDB, syncedDB);
	}

	async gets(): Promise<any> {
		let data: any = undefined;
		try {
			let unsyncedNotes = await bibleStorer.getAllValue(UNSYNCED_NOTES);
			let syncedNotes = await bibleStorer.getAllValue(NOTES);

			let concatNotes: any = new Map();
			syncedNotes.forEach((p: any) => {
				concatNotes.set(p.id, p);
			});

			unsyncedNotes.forEach((p: any) => {
				concatNotes.set(p.id, p);
			});

			data = Array.from(concatNotes.values());
		} catch (error) {
			console.log(`error getting all notes from indexedDB: ${error}`);
		}
		return data;
	}

	async delete(id: string): Promise<any> {
		await offlineApi.delete(id, PATH, UNSYNCED_NOTES, NOTES);
	}
}

export let notesApi = new NotesApi();
