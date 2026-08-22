import { chapterApi } from '$lib/nostr/events/chapters.nostr';
import {
  jsonToChapter,
  newChapter,
  type Chapter
} from '$lib/domains/bible/models/bible.model';

class ChapterService {
  async get(ref: string): Promise<Chapter> {
    try {
      let chapter = await chapterApi.getChapter(ref);
      return jsonToChapter(chapter);
    } catch (err: any) { }

    return newChapter();
  }
}

export const chapterService = new ChapterService();
