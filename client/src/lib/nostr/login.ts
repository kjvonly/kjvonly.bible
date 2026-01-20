import { getPublicKey, nip19 } from 'nostr-tools';
import { author, loginType, pubkey } from './stores/author';
import { WebStorage } from './webstorage';
import { get } from 'svelte/store';
import { Author } from './author';

export class Login {

  public async withNsec(key: string) {
    const { type, data: seckey } = nip19.decode(key);
    if (type !== 'nsec') {
      console.error('Invalid nsec');
      return;
    }

    const storage = new WebStorage(localStorage);
    storage.set('login', key);

    loginType.set('nsec');
    pubkey.set(getPublicKey(seckey));
    await this.fetchAuthor();
  }


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
