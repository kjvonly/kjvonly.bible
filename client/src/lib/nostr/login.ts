import { author, pubkey } from './stores/author';
import { loalStorageService } from './services/localStorage.service';
import { get } from 'svelte/store';
import { Author } from './author';

export class Login {

  private async fetchAuthor() {
    console.time('fetch author');

    const $author = new Author(get(pubkey));

    await $author.fetchRelays();
    console.timeLog('fetch author');

    await $author.fetchEvents();
    console.timeEnd('fetch author');

    author.set($author);

    //remoteSigner.subscribeIfEnabled();
  }
}
