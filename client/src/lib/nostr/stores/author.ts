import { writable, type Writable } from "svelte/store";

export const loginType: Writable<'NIP-07' | 'NIP-46' | 'nsec' | 'npub' | undefined> = writable();
export const pubkey = writable('');
export const author: Writable<Author | undefined> = writable();

