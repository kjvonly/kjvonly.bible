import type { Relay } from "$lib/nostr/services/constants.service";
import { localStorageService } from "$lib/nostr/services/localStorage.service";
import { relayService } from "$lib/nostr/services/relay.service";
import { kinds as Kind, type Event, type Nostr, type UnsignedEvent } from "nostr-tools";

import { z } from "zod";

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
  petname: string;
  Relay: string[];
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
  petname: string = '';
  Relay: string[] = [];
  name: string = '';
  about: string = '';
  picture: string = '';
  followees: { [key: string]: IFollowee } = {};

  constructor(pubkey: string, userService: IUserService) {
    this.pubkey = pubkey

    // follow yourself
    this.followees[this.pubkey] = this;

  }

  init() {


  }
}

export interface IUserService {



}

export interface NostrMetadata {
  name?: string;
  about?: string;
  picture?: string;
}

interface ISerialize {
  json(): string;
}

class NostrKindFactory {
  kinds: { [kind: number]: any } = {}

  register(kind: number, newFn: (e: Event) => NostrKind): void {
    this.kinds[kind] = newFn;
  }

  get(e: Event): NostrKind {
    // TODO good place to verify event too
    if (this.validate(e)) {
      let fn = this.kinds[e.kind]
      if (fn) {
        let nk: NostrKind = fn(e)
        nk.validate()
        return nk
      }
    }
    return new NullKind(e)
  }

  validate(e: Event): boolean {
    let result = NSchema.event().safeParse(e)
    if (!result.success) {
      console.error('[Metadata validate]', result.error)
      return false
    }
    return true
  }
}

const nostrKindFactory = new NostrKindFactory();

abstract class NostrKind implements ISerialize {
  event: Event
  content: any = {}

  constructor(e: Event) {
    this.event = e
  }

  json(): string {
    return JSON.stringify(this.event.content)
  }

  abstract validate(): boolean;
}

class NullKind extends NostrKind {
  constructor() {
    super({
      kind: 0,
      tags: [],
      content: "",
      created_at: 0,
      pubkey: "",
      id: "",
      sig: ""
    })
  }

  validate(): boolean {
    throw new Error("Method not implemented.");
  }
}

class Metadata extends NostrKind {
  static kind: number = Kind.Metadata;
  content: NostrMetadata = {}

  constructor(e: Event) {
    super(e)
  }

  validate(): boolean {
    let result = NSchema.metadata().safeParse(this.event.content)
    if (result.success) {
      this.content = result.data;
    }
    return result.success
  }
}

nostrKindFactory.register(Metadata.kind, (e: Event) => { return new Metadata(e) })

class RelayList extends NostrKind {
  constructor(e: Event) {
    super(e)
  }

  validate(): boolean {
    return true
  }

}


export class UserService implements IUserService {

  // =================== GET CurrentUser Data =================================

  dayInMilliseconds = 24 * 60 * 60 * 1000;

  async getCurrentUserData(pubkey: string): Promise<[Metadata, RelayList]> {
    let [metadata, relayList] = this.getCurrentUserDataFromCache()
    if (metadata instanceof NullKind || relayList instanceof NullKind) {
      return this.getCurrentUserDataFromRelay(pubkey)
    }
    return [metadataEvent, relayList]
  }

  getCurrentUserDataFromCache(): [Metadata, RelayList] {
    let metadata = localStorageService.get('kind:0')
    let relayList = localStorageService.get('kind:10002')

    if (metadata && relayList && this.isCacheHot()) {
      let metadataEvent = nostrKindFactory.get(JSON.parse(metadata))
      let relayListEvent = nostrKindFactory.get(JSON.parse(relayList))

      return [metadataEvent, relayListEvent]
    }

    return [new NullKind(), new NullKind()]
  }

  async getCurrentUserDataFromRelay(pubkey: string): Promise<Event[] | null> {
    let filter: NostrFilter = {
      authors: [pubkey],
      kinds: [Kind.Metadata, Kind.RelayList]
    }

    let events = await relayService.getEvents(filter)
    this.cacheEvents(events)
    return events
  }

  cacheEvents(events: Event[] | null) {
    events?.forEach((e: Event) => {
      localStorageService.set(`kind:${e.kind}`, JSON.stringify(e))
    })
    localStorageService.set('cached_at', `${Date.now()}`)
  }

  isCacheHot(): boolean {
    let cachedAt = localStorageService.get('cached_at')
    const time1 = parseInt(cachedAt ? cachedAt : '', 10);

    if (isNaN(time1)) {
      console.error("[Invalid cached_at time]");
      return false
    }

    const diffInMs = Math.abs(Date.now() - time1);
    return diffInMs < this.dayInMilliseconds
  }

  // =================== PUT CurrentUser Data =================================

  async putCurrentUserMetadata(user: IUser): Promise<Event> {

    // create kind 1 event and publish and cache 
    let event: UnsignedEvent = {
      kind: Kind.Metadata,
      content: JSON.stringify(user),
      tags: [],
      created_at: 0,
      pubkey: '',
    }

    return await relayService.publishEvent(event);
  }

  async putCurrentUserRelayList(relays: Relay[]): Promise<Event> {

    let tags = relays.map((r: Relay) => {
      return this.getRelayTag(r)
    })

    // create kind 1 event and publish and cache 
    let event: UnsignedEvent = {
      kind: Kind.RelayList,
      content: "",
      tags: tags,
      created_at: 0,
      pubkey: '',
    }

    return await relayService.publishEvent(event);
  }


  getRelayTag(r: Relay) {
    let type = ""
    if (r.read && r.write) { type = ""; }
    else if (r.read) { type = "read"; }
    else if (r.write) { type = "write"; }

    return ["r", r.url, type]
  }




}


// from nostrify 
// TODO add their mit license

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

/** Kind 0 metadata. */
export interface NostrMetadata {
  /** A short description of the user. */
  about?: string;
  /** A URL to a wide (~1024x768) picture to be optionally displayed in the background of a profile screen. */
  banner?: string;
  /** A boolean to clarify that the content is entirely or partially the result of automation, such as with chatbots or newsfeeds. */
  bot?: boolean;
  /** An alternative, bigger name with richer characters than `name`. `name` should always be set regardless of the presence of `display_name` in the metadata. */
  display_name?: string;
  /** A bech32 lightning address according to NIP-57 and LNURL specifications. */
  lud06?: string;
  /** An email-like lightning address according to NIP-57 and LNURL specifications. */
  lud16?: string;
  /** A short name to be displayed for the user. */
  name?: string;
  /** An email-like Nostr address according to NIP-05. */
  nip05?: string;
  /** A URL to the user's avatar. */
  picture?: string;
  /** A web URL related in any way to the event author. */
  website?: string;
  [key: string]: unknown;
}

/** NIP-01 Nostr event. */
export interface NostrEvent {
  /** 32-bytes lowercase hex-encoded sha256 of the serialized event data. */
  id: string;
  /** 32-bytes lowercase hex-encoded public key of the event creator */
  pubkey: string;
  /** Unix timestamp in seconds. */
  created_at: number;
  /** Integer between 0 and 65535. */
  kind: number;
  /** Matrix of arbitrary strings. */
  tags: string[][];
  /** Arbitrary string. */
  content: string;
  /** 64-bytes lowercase hex of the signature of the sha256 hash of the serialized event data, which is the same as the `id` field. */
  sig: string;
}




/**
 * A suite of [zod](https://github.com/colinhacks/zod) schemas for Nostr.
 *
 * ```ts
 * import { NSchema as n } from '@nostrify/nostrify';
 *
 * const event: NostrEvent = n.event().parse(eventData);
 * const metadata: NostrMetadata = n.json().pipe(n.metadata()).parse(event.content);
 * const msg: NostrRelayMsg = n.relayMsg().parse(e.data);
 * const nsec: `nsec1${string}` = n.bech32('nsec').parse(token);
 * ```
 */
export class NSchema {

  static relayList() {
    return z.array(z.tuple([
      z.literal('r'),
      z.string().url().refine((url) => url.startsWith('ws://') || url.startsWith('wss://')),
    ]).rest(
      z.union([
        z.literal(''),
        z.literal('read'),
        z.literal('write')
      ]).optional()
    ));
  }


  /** Schema to validate Nostr hex IDs such as event IDs and pubkeys. */
  static id() {
    return z.string().regex(/^[0-9a-f]{64}$/);
  }

  /** Nostr event schema. */
  static event() {
    return z.object({
      id: NSchema.id(),
      kind: z.number().int().nonnegative(),
      pubkey: NSchema.id(),
      tags: z.string().array().array(),
      content: z.string(),
      created_at: z.number().int().nonnegative(),
      sig: z.string(),
    }).required({
      id: true,
      kind: true,
      pubkey: true,
      tags: true,
      content: true,
      created_at: true,
      sig: true,
    });
  }

  /** Nostr filter schema. */
  static filter() {
    return z.looseObject({
      kinds: z.number().int().nonnegative().array().optional(),
      ids: NSchema.id().array().optional(),
      authors: NSchema.id().array().optional(),
      since: z.number().int().nonnegative().optional(),
      until: z.number().int().nonnegative().optional(),
      limit: z.number().int().nonnegative().optional(),
      search: z.string().optional(),
    })
      .transform((value) => {
        const keys = [
          "kinds",
          "ids",
          "authors",
          "since",
          "until",
          "limit",
          "search",
        ];
        return Object.entries(value).reduce((acc, [key, val]) => {
          if (keys.includes(key) || key.startsWith("#")) {
            acc[key] = val;
          }
          return acc;
        }, {} as Record<string, unknown>) as NostrFilter;
      });
  }

  /**
   * Bech32 string.
   * @see https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki#bech32
   */
  static bech32<P extends string>(prefix?: P) {
    return z
      .string()
      .regex(/^[\x21-\x7E]{1,83}1[023456789acdefghjklmnpqrstuvwxyz]{6,}$/)
      .refine((value) =>
        prefix ? value.startsWith(`${prefix}1`) : true
      );
  }

  /** WebSocket URL starting with `ws://` or `wss://`. */
  static relayUrl() {
    return z
      .url()
      .regex(/^wss?:\/\//);
  }

  /** NIP-01 `EVENT` message from client to relay. */
  static clientEVENT() {
    return z.tuple([
      z.literal("EVENT"),
      NSchema.event(),
    ]);
  }

  /** NIP-01 `REQ` message from client to relay. */
  static clientREQ() {
    return z.tuple([z.literal("REQ"), z.string()]).rest(NSchema.filter());
  }

  /** NIP-45 `COUNT` message from client to relay. */
  static clientCOUNT() {
    return z.tuple([z.literal("COUNT"), z.string()]).rest(NSchema.filter());
  }

  /** NIP-01 `CLOSE` message from client to relay. */
  static clientCLOSE() {
    return z.tuple([z.literal("CLOSE"), z.string()]);
  }

  /** NIP-42 `AUTH` message from client to relay. */
  static clientAUTH() {
    return z.tuple([
      z.literal("AUTH"),
      NSchema.event(),
    ]);
  }

  /** NIP-01 message from client to relay. */
  static clientMsg() {
    return z.union([
      NSchema.clientEVENT(),
      NSchema.clientREQ(),
      NSchema.clientCOUNT(),
      NSchema.clientCLOSE(),
      NSchema.clientAUTH(),
    ]);
  }

  /** NIP-01 `EVENT` message from relay to client. */
  static relayEVENT() {
    return z.tuple([
      z.literal("EVENT"),
      z.string(),
      NSchema.event(),
    ]);
  }

  /** NIP-01 `OK` message from relay to client. */
  static relayOK() {
    return z.tuple([
      z.literal("OK"),
      NSchema.id(),
      z.boolean(),
      z.string(),
    ]);
  }

  /** NIP-01 `EOSE` message from relay to client. */
  static relayEOSE() {
    return z.tuple([z.literal("EOSE"), z.string()]);
  }

  /** NIP-01 `NOTICE` message from relay to client. */
  static relayNOTICE() {
    return z.tuple([z.literal("NOTICE"), z.string()]);
  }

  /** NIP-01 `CLOSED` message from relay to client. */
  static relayCLOSED() {
    return z.tuple([
      z.literal("CLOSED"),
      z.string(),
      z.string(),
    ]);
  }

  /** NIP-42 `AUTH` message from relay to client. */
  static relayAUTH() {
    return z.tuple([z.literal("AUTH"), z.string()]);
  }

  /** NIP-45 `COUNT` message from relay to client. */
  static relayCOUNT() {
    return z.tuple([
      z.literal("COUNT"),
      z.string(),
      z.object({
        count: z.number().int().nonnegative(),
        approximate: z.boolean().optional(),
      }),
    ]);
  }

  /** NIP-01 message from relay to client. */
  static relayMsg() {
    return z.union([
      NSchema.relayEVENT(),
      NSchema.relayOK(),
      NSchema.relayEOSE(),
      NSchema.relayNOTICE(),
      NSchema.relayCLOSED(),
      NSchema.relayAUTH(),
      NSchema.relayCOUNT(),
    ]);
  }

  /** Kind 0 content schema. */
  static metadata() {
    return z.looseObject({
      about: z.string().optional().catch(undefined),
      banner: z.url().optional().catch(undefined),
      bot: z.boolean().optional().catch(undefined),
      display_name: z.string().optional().catch(undefined),
      lud06: NSchema.bech32("lnurl").optional().catch(undefined),
      lud16: z.email().optional().catch(undefined),
      name: z.string().optional().catch(undefined),
      nip05: z.email().optional().catch(undefined),
      picture: z.url().optional().catch(undefined),
      website: z.url().optional().catch(undefined),
    });
  }

  /** NIP-11 Relay Information Document schema. */
  static relayInfo() {
    return z.looseObject({
      name: z.string().optional().catch(undefined),
      description: z.string().optional().catch(undefined),
      pubkey: NSchema.id().optional().catch(undefined),
      contact: z.string().optional().catch(undefined),
      supported_nips: z.number().int().nonnegative().array().optional().catch(undefined),
      software: z.string().optional().catch(undefined),
      version: z.string().optional().catch(undefined),
      limitation: z.looseObject({
        max_message_length: z.number().int().nonnegative().optional().catch(undefined),
        max_subscriptions: z.number().int().nonnegative().optional().catch(undefined),
        max_filters: z.number().int().nonnegative().optional().catch(undefined),
        max_limit: z.number().int().nonnegative().optional().catch(undefined),
        max_subid_length: z.number().int().nonnegative().optional().catch(undefined),
        max_event_tags: z.number().int().nonnegative().optional().catch(undefined),
        max_content_length: z.number().int().nonnegative().optional().catch(undefined),
        min_pow_difficulty: z.number().int().nonnegative().optional().catch(undefined),
        auth_required: z.boolean().optional().catch(undefined),
        payment_required: z.boolean().optional().catch(undefined),
        restricted_writes: z.boolean().optional().catch(undefined),
        created_at_lower_limit: z.number().int().nonnegative().optional().catch(undefined),
        created_at_upper_limit: z.number().int().nonnegative().optional().catch(undefined),
      }).optional().catch(undefined),
      retention: z.array(z.object({
        time: z.number().int().nullable(),
        count: z.number().int().nonnegative().optional(),
        kinds: z.number().int().nonnegative().array().optional(),
      })).optional().catch(undefined),
      relay_countries: z.string().array().optional().catch(undefined),
      language_tags: z.string().array().optional().catch(undefined),
      tags: z.string().array().optional().catch(undefined),
      posting_policy: z.string().optional().catch(undefined),
      payments_url: z.string().optional().catch(undefined),
      fees: z.record(z.string(), z.array(z.object({
        amount: z.number(),
        unit: z.string(),
        period: z.number().int().nonnegative().optional(),
        kinds: z.number().int().nonnegative().array().optional(),
      }))).optional().catch(undefined),
      icon: z.string().optional().catch(undefined),
    });
  }

  /** NIP-46 request content schema. */
  static connectRequest() {
    return z.object({
      id: z.string(),
      method: z.string(),
      params: z.string().array(),
    });
  }

  /** NIP-46 response content schema. */
  static connectResponse() {
    return z.object({
      id: z.string(),
      result: z.string(),
      error: z.string().optional(),
    });
  }

  /**
   * Helper schema to parse a JSON string. It should then be piped into another schema. For example:
   *
   * ```ts
   * const event = NSchema.json().pipe(NSchema.event()).parse(data);
   * ```
   */
  static json() {
    return z.string().transform((value, ctx) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid JSON" });
        return z.NEVER;
      }
    });
  }
}

export { NSchema, z };
