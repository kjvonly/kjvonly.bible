import type { Author } from "$lib/nostr/models/author";
import { constantsService, type Relay } from "./constants.service";


export class AuthorService {
  pubkey: string = ''
  author: Author | undefined

  allRelays: Relay[] = []
  readRelays: string[] = [];
  writeRelays: string[] = [];

  constructor() {
    this.setDefaultReadRelays();
    this.setDefaultWriteRelays();
    this.setAllRelays();
  }

  setDefaultReadRelays() {
    constantsService
      .defaultRelays
      .filter((relay) => relay.read)
      .map((relay) => relay.url)
  }

  setDefaultWriteRelays() {
    constantsService
      .defaultRelays
      .filter((relay) => relay.write)
      .map((relay) => relay.url)
  }

  setAllRelays(

  ) {
    this.allRelays = [...constantsService.defaultRelays]
  }
}


export const authorService = new AuthorService()
