import { annotsApi } from '$lib/nostr/events/annots.nostr';
import { newAnnotation, type Annotations } from '$lib/models/bible.model';
import { bibleStorer } from '$lib/storer/bible.storer';
import { ANNOTATIONS } from '$lib/storer/bible.db';

export class AnnotsService {
  async get(bibleLocationRef: string): Promise<Annotations> {
    try {
      return await annotsApi.getAnnotations(bibleLocationRef);
    } catch (err: any) { }

    return newAnnotation();
  }

  async put(annots: Annotations): Promise<Annotations> {
    return await annotsApi.putAnnotations(annots)
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


export const annotsService = new AnnotsService();
