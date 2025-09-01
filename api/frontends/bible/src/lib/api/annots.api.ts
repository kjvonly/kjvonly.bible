import { bibleStorer } from '../storer/bible.storer';
import { extractBookChapter } from '$lib/utils/chapter';
import { offlineApi } from './offline.api';
import { ANNOTATIONS, UNSYNCED_ANNOTATIONS } from '$lib/storer/bible.db';

export class AnnotsApi {
	async getAnnotations(chapterKey: string): Promise<any> {
		chapterKey = extractBookChapter(chapterKey);
		let annotations = await offlineApi.cacheHit(chapterKey, UNSYNCED_ANNOTATIONS, ANNOTATIONS);

		if (!annotations) {
			annotations = {
				id: chapterKey,
				version: 0,
				annots: {}
			};
		}
		return annotations;
	}

	async putAnnotations(data: any): Promise<any> {
		let path = '/annots';
		let unsyncedDB = UNSYNCED_ANNOTATIONS;
		let syncedDB = ANNOTATIONS;
		return await offlineApi.put(data, path, unsyncedDB, syncedDB);
	}

	// TODO update import export
	async putAllAnnotations(objects: any): Promise<any> {
		try {
			await bibleStorer.putBulkValue(ANNOTATIONS, objects);
		} catch (error) {
			console.log(`error importing all annotations from indexedDB: ${error}`);
		}
	}

	async getAllAnnotations(): Promise<any> {
		let data: any = undefined;
		try {
			data = await bibleStorer.getAllValue(ANNOTATIONS);
		} catch (error) {
			console.log(`error getting all annotations from indexedDB: ${error}`);
		}
		return data;
	}
}

export let annotsApi = new AnnotsApi();
