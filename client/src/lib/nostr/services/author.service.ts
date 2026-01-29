import type { Author } from "$lib/nostr/models/author";

export class AuthorService {
  pubkey: string = ''
  author: Author | undefined
}


export const authorService = new AuthorService()
