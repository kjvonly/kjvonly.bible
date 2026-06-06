import { pericopesApi } from "$lib/nostr/events/pericopes.nostr";

class PericopesService {
  async get(ref: string): Promise<{}> {
    try {
      return await pericopesApi.get(ref);
    } catch (err: any) { }

    return {};
  }
}

export const pericopesService = new PericopesService();
