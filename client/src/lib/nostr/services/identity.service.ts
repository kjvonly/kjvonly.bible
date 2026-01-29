import { getPublicKey, nip19 } from "nostr-tools"
import { localStorageService } from "./localStorage.service"
import { authorService } from "./author.service"

export interface Identity {
  type: string
  pubkey: string
}
export class IdentityService {

  getIdentity(): string | null {
    return localStorageService.get('login')
  }

  init() {
    let savedIdentity = this.getIdentity()
    if (!savedIdentity) {
      return
    }

    if (savedIdentity.startsWith("nsec")) {
      this.withNsec(savedIdentity)
    }
  }

  isLoggedIn() {
    const savedLogin = localStorageService.get('login');
    console.debug('[IdentityService isLoggedIn]', savedLogin);

    if (savedLogin === null) {
      return false;
    }

    return true;
  }

  withNsec(key: string): boolean {
    console.debug('[IdentityService withNsec]')

    const { type, data: privateKey } = nip19.decode(key);
    if (type !== 'nsec') {
      console.error('Invalid nsec');
      return false;
    }
    localStorageService.set('login', key);
    let pubKey =
      getPublicKey(privateKey)
    authorService.pubkey = pubKey

    console.debug('[IdentityService withNsec pubkey]', pubKey)
    return true
  }







}

export const identityService = new IdentityService()
