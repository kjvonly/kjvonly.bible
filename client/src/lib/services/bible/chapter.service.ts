import { chapterApi } from '$lib/api/chapters.api';
import {
  jsonToChapter,
  newChapter,
  type Chapter
} from '$lib/models/bible.model';

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
