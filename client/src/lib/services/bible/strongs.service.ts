import { strongsApi } from '$lib/api/strongs.api';
import { newStrongs, type Strongs } from '$lib/models/strongs.model';

export class StrongsService {
  jsonToStrongs(strongs: string): Strongs {
    return JSON.parse(JSON.stringify(strongs));
  }

  async get(ref: string): Promise<Strongs> {
    try {
      let strongs = await strongsApi.get(ref);
      return await this.jsonToStrongs(strongs);
    } catch (err: any) { }

    return newStrongs();
  }
}

export const strongsService = new StrongsService();
