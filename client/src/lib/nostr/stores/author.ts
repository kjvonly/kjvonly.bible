import { writable, type Writable } from "svelte/store";

export const pubkey = writable('');
export const author: Writable<Author | undefined> = writable();

