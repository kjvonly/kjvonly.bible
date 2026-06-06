import { paragraphsApi } from '$lib/nostr/events/paragraphs.nostr';
import { BIBLE_VERSIONS, bibleDB } from '$lib/storer/bible.db';
import { syncService } from '../sync.service';

class BibleVersionsService {
  async list(): Promise<string[]> {
    try {
      let bibleVersions = await bibleDB.getAllKeys(BIBLE_VERSIONS)

      return bibleVersions.map(v => String(v))
    } catch (err: any) { }

    return [];
  }

  async delete(version: string): Promise<any> {
    await bibleDB.deleteValue(BIBLE_VERSIONS, version)
    await syncService.deleteVersion(version)
  }
}

export const bibleVersionsService = new BibleVersionsService();
