import { pericopesApi } from "$lib/api/pericopes.api";

class PericopesService {
  async get(ref: string): Promise<{}> {
    try {
      return await pericopesApi.get(ref);
    } catch (err: any) { }

    return {};
  }
}

export const pericopesService = new PericopesService();
