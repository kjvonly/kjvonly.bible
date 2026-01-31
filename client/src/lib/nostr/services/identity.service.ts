import { getPublicKey, nip19 } from "nostr-tools"
import { localStorageService } from "./localStorage.service"
import { authorService } from "./author.service"


export class IdentityService {

  init(): void {
    let savedIdentity = this.getIdentity()
    if (!savedIdentity) {
      return
    }

    if (savedIdentity.startsWith("nsec")) {
      this.withNsec(savedIdentity)
    }
  }

  getIdentity(): string | null {
    return localStorageService.get('login')
  }

  withNsec(key: string): boolean {
    console.debug('[IdentityService withNsec]')

    const { type, data: privateKey } = nip19.decode(key);
    if (type !== 'nsec') {
      console.error('Invalid nsec');
      return false;
    }
    localStorageService.set('login', key);

    this.setAuthorPubkey(privateKey)
    return true
  }

  private setAuthorPubkey(privateKey: Uint8Array): void {
    let pubKey = getPublicKey(privateKey)
    authorService.pubkey = pubKey

    console.debug('[IdentityService setAuthorPubkey pubkey]', pubKey)
  }


  isLoggedIn() {
    const savedLogin = localStorageService.get('login');
    console.debug('[IdentityService isLoggedIn]', savedLogin);

    if (savedLogin === null) {
      return false;
    }

    return true;
  }


}

export const identityService = new IdentityService()
