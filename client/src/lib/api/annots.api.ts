import { bibleStorer } from '../storer/bible.storer';
import { offlineApi } from './offline.api';
import { ANNOTATIONS, UNSYNCED_ANNOTATIONS } from '$lib/storer/bible.db';
import { bibleLocationReferenceService } from '$lib/services/bible/bibleLocationReference.service';

export class AnnotsApi {
	async getAnnotations(bibleLocationRef: string): Promise<any> {
		bibleLocationRef =
			bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef);
		let annotations = await offlineApi.cacheHit(
			bibleLocationRef,
			UNSYNCED_ANNOTATIONS,
			ANNOTATIONS
		);

		if (!annotations) {
			annotations = {
				id: bibleLocationRef,
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
		// TODO - GET UNSYNCED DATA
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
