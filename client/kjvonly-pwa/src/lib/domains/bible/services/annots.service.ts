import { annotsApi } from '$lib/nostr/events/annots.nostr';
import { newAnnotation, type Annotations } from '$lib/domains/bible/models/bible.model';
import { bibleStorer } from '$lib/domains/bible/persistence/bible.storer';
import { ANNOTATIONS } from '$lib/domains/bible/persistence/bible.db';

type AnnotationSubscriber = {
  subscriberID: string;
  annotationID: string;
  fn: (annotations: Annotations) => void;
};

export class AnnotsService {
  private subscribers: AnnotationSubscriber[] = [];

  async get(bibleLocationRef: string): Promise<Annotations> {
    try {
      return await annotsApi.getAnnotations(bibleLocationRef);
    } catch (err: any) { }

    return newAnnotation();
  }

  async put(annots: Annotations): Promise<Annotations> {
    const saved = await annotsApi.putAnnotations(annots);

    if (saved !== undefined) {
      this.notify(saved);
    }

    return saved;
  }

  subscribe(
    subscriberID: string,
    annotationID: string,
    fn: (annotations: Annotations) => void
  ) {
    this.unsubscribe(subscriberID);
    this.subscribers.push({ subscriberID, annotationID, fn });
  }

  unsubscribe(subscriberID: string) {
    this.subscribers = this.subscribers.filter(
      (subscriber) => subscriber.subscriberID !== subscriberID
    );
  }

  private notify(annotations: Annotations) {
    this.subscribers.forEach((subscriber) => {
      if (subscriber.annotationID === annotations.id) {
        subscriber.fn(annotations);
      }
    });
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
