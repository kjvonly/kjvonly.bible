import { paragraphsApi } from '$lib/nostr/events/paragraphs.nostr';

class ParagraphsService {
  async get(ref: string): Promise<{}> {
    try {
      return await paragraphsApi.get(ref);
    } catch (err: any) { }

    return {};
  }
}

export const paragraphsService = new ParagraphsService();
