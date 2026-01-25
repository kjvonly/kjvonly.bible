import { localStorageService } from "$lib/nostr/services/localStorage.service";
import { nip19 } from "nostr-tools";
import { writable, type Writable } from "svelte/store";

class AuthService {
  isLoggedIn() {
    const savedLogin = localStorageService.get('login');
    console.debug('[AuthService isLoggedIn]', savedLogin);

    if (savedLogin === null) {
      return false;
    }

    return true;
  }

  public async withNsec(key: string): Promise<void> {
    const { type, data: _ } = nip19.decode(key);
    if (type !== 'nsec') {
      console.error('Invalid nsec');
      return;
    }
    localStorageService.set('login', key);
  }
}


export let authService = new AuthService();
