import { paragraphsApi } from '$lib/api/paragraphs.api';

class ParagraphsService {
  async get(ref: string): Promise<{}> {
    try {
      return await paragraphsApi.get(ref);
    } catch (err: any) { }

    return {};
  }
}

export const paragraphsService = new ParagraphsService();
