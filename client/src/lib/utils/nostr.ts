import { type Event } from 'nostr-tools';

export const KJVONLY_PUBKEY = `${import.meta.env.VITE_NOSTR_KJVONLY_PUBKEY}`;
export const KJVONLY_REALY_URL = `${import.meta.env.VITE_NOSTR_RELAY_URL}`;



export function getTags(event: Event, tagName: string): string[] {
  return event.tags
    .filter(tag => tag[0] === tagName)
    .map(tag => tag[1]) || [];
}

/** 
 * Finds first tag and returns the value */
export function getTag(event: Event, tagName: string): string {
  let tags = event.tags
    .filter(tag => tag[0] === tagName)
    .map(tag => tag[1]);

  if (tags.length === 0) {
    return ''
  }

  return tags[0]
}


