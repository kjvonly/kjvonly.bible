import { localStorageService } from "$lib/nostr/services/localStorage.service";
import { relayService } from "$lib/nostr/services/relay.service";
import { kinds as Kind, type Event } from "nostr-tools";

export interface IUser {
  name: string;
  about: string;
  picture: string;
}


export interface IContent {
  type: string
  lastSyncedTimestamp: number
  persist: boolean;
}

export interface IFollowee extends IUser {
  content: IContent[];
  petname: string;
  Relay: string[];
  Filter(): Event;
}


export interface INostrApp extends IFollowee {
  pubkey: string;
}


export interface ICurrentUser extends IFollowee {
  pubkey: string;
  followees: { [key: string]: IFollowee };
}


export class CurrentUser implements ICurrentUser {
  pubkey: string;
  content: IContent[] = [];
  petname: string = '';
  Relay: string[] = [];
  Filter(): Event {
    throw new Error("Method not implemented.");
  }
  name: string = '';
  about: string = '';
  picture: string = '';
  followees: { [key: string]: IFollowee } = {};

  constructor(pubkey: string, userService: IUserService) {
    this.pubkey = pubkey

    // follow yourself
    this.followees[this.pubkey] = this;
  }
}

export interface IUserService {



}

/** NIP-01 Nostr filter. */
export interface NostrFilter {
  /** A list of event IDs. */
  ids?: string[];
  /** A list of lowercase pubkeys, the pubkey of an event must be one of these. */
  authors?: string[];
  /** A list of a kind numbers. */
  kinds?: number[];
  /** An integer unix timestamp in seconds, events must be newer than this to pass. */
  since?: number;
  /** An integer unix timestamp in seconds, events must be older than this to pass. */
  until?: number;
  /** Maximum number of events relays SHOULD return in the initial query. */
  limit?: number;
  /** NIP-50 search query. */
  search?: string;
  /** A list of tag values, for #e — a list of event ids, for #p — a list of pubkeys, etc. */
  [key: `#${string}`]: string[] | undefined;
}

export class UserService {

  dayInMilliseconds = 24 * 60 * 60 * 1000;

  async getCurrentUserData(pubkey: string): Promise<Event[] | null> {
    let events = this.getCurrentUserDataFromCache()
    if (events) {
      return events
    }
    return this.getCurrentUserDataFromRelay(pubkey)
  }

  getCurrentUserDataFromCache(): Event[] | null {
    let metadata = localStorageService.get('kind:0')
    let relayList = localStorageService.get('kind:10002')

    if (metadata && relayList && this.isCacheHot()) {
      let metadataEvent = JSON.parse(metadata) as Event
      let relayListEvent = JSON.parse(relayList) as Event

      return [metadataEvent, relayListEvent]
    }

    return null
  }

  async getCurrentUserDataFromRelay(pubkey: string): Promise<Event[] | null> {
    let filter: NostrFilter = {
      authors: [pubkey],
      kinds: [Kind.Metadata, Kind.RelayList]
    }

    return await relayService.getEvents(filter)
  }

  isCacheHot(): boolean {
    let cachedAt = localStorageService.get('cached_at')
    const time1 = parseInt(cachedAt, 10);

    if (isNaN(time1)) {
      console.error("[Invalid cached_at time]");
      return false
    }

    const diffInMs = Math.abs(Date.now() - time1);
    return diffInMs < this.dayInMilliseconds
  }
}
