import { nip57, type Event, nip19 } from 'nostr-tools';
import type { pubkey } from './Types';
import { filterTags, referTags } from './EventHelper';

export interface Item {
  readonly event: Event;
}

export class EventItem implements Item {
  constructor(public readonly event: Event) { }

  public get replyToPubkeys(): pubkey[] {
    return [...new Set(filterTags('p', this.event.tags))];
  }

  public get id(): string {
    return this.event.id;
  }

  public get replyToId(): string | undefined {
    const { root, reply } = referTags(this.event);
    return reply?.at(1) ?? (this.event.kind === 1 ? root?.at(1) : undefined);
  }
}

export class Metadata implements Item {
  public readonly content: MetadataContent | undefined;
  private _zapUrl: URL | null | undefined;
  constructor(public readonly event: Event) {
    try {
      this.content = JSON.parse(event.content);
    } catch (error) {
      console.warn('[invalid metadata item]', error, event);
    }
  }

  public get id(): string {
    return this.event.id;
  }

  get name(): string {
    if (this.content?.name) {
      return this.content.name;
    } else if (this.content?.display_name) {
      return this.content.display_name;
    } else {
      return alternativeName(this.event.pubkey);
    }
  }

  get displayName(): string {
    if (this.content?.display_name) {
      return this.content.display_name;
    } else if (this.content?.name) {
      return this.content.name;
    } else {
      return alternativeName(this.event.pubkey);
    }
  }

  get picture(): string {
    return this.content?.picture
      ? this.getRedirectedUrlIfNostrBuild(this.content.picture)
      : robohash(this.event.pubkey);
  }

  get normalizedNip05(): string {
    if (this.content?.nip05 === undefined || typeof this.content.nip05 !== 'string') {
      return '';
    }

    return this.content.nip05.replace(/^_@/, '');
  }

  get about(): string {
    return this.content?.about ?? '';
  }

  public startsWith(searchString: string, position?: number | undefined): boolean {
    const lowerCaseSearchString = searchString.toLowerCase();
    return (
      this.name.toLocaleLowerCase().startsWith(lowerCaseSearchString, position) ||
      this.displayName.toLocaleLowerCase().startsWith(lowerCaseSearchString, position) ||
      this.normalizedNip05.toLocaleLowerCase().startsWith(lowerCaseSearchString, position)
    );
  }

  public includes(searchString: string, position?: number | undefined): boolean {
    const lowerCaseSearchString = searchString.toLowerCase();
    return (
      this.name.toLocaleLowerCase().includes(lowerCaseSearchString, position) ||
      this.displayName.toLocaleLowerCase().includes(lowerCaseSearchString, position) ||
      this.normalizedNip05.toLocaleLowerCase().includes(lowerCaseSearchString, position) ||
      nip19.npubEncode(this.event.pubkey).includes(searchString)
    );
  }

  // Workaround for iOS Safari
  private getRedirectedUrlIfNostrBuild(url: string): string {
    if (url.startsWith('https://nostr.build/i/')) {
      return url.startsWith('https://nostr.build/i/p/')
        ? url.replace('https://nostr.build/i/p/', 'https://pfp.nostr.build/')
        : url.replace('https://nostr.build/i/', 'https://image.nostr.build/');
    } else if (url.startsWith('https://cdn.nostr.build/i/')) {
      return url.startsWith('https://cdn.nostr.build/i/p/')
        ? url.replace('https://cdn.nostr.build/i/p/', 'https://pfp.nostr.build/')
        : url.replace('https://cdn.nostr.build/i/', 'https://image.nostr.build/');
    } else {
      return url;
    }
  }
}

export interface MetadataContent {
  name: string;
  display_name: string;
  nip05: string;
  picture: string;
  banner: string;
  website: string;
  about: string;
  lud06: string;
  lud16: string;
}

export function robohash(pubkey: string, size = 120): string {
  return `https://robohash.org/${nip19.npubEncode(pubkey)}?set=set4&size=${size}x${size}`;
}

export function alternativeName(pubkey: string): string {
  return nip19.npubEncode(pubkey).slice(0, 'npub1'.length + 7);
}
