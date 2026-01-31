import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools"
import { localStorageService } from "./localStorage.service"
import { authorService } from "./author.service"

export const LOGIN_KEY: string = 'login'
export const ANONYMOUS_PREFIX = 'anonymous_'


export class LoginService {
  init(): void {
    let savedLogin = this.getLogin()

    if (!savedLogin || this.isAnonymouslyLoggedIn()) {
      this.withNsecAnonymous()
    } else if (savedLogin?.startsWith("nsec")) {
      this.withNsec(savedLogin)
    }
  }


  getLogin(): string | null {
    return localStorageService.get(LOGIN_KEY)
  }

  withNsecAnonymous(): void {
    console.debug('[LoginService withNsecAnonymous]')
    let privateKey = generateSecretKey()
    let nsec = nip19.nsecEncode(privateKey)
    localStorageService.set(LOGIN_KEY, `${ANONYMOUS_PREFIX}${nsec}`)
    this.setAuthorPubkey(privateKey)
  }

  withNsec(key: string): boolean {
    console.debug('[LoginService withNsec]')

    const { type, data: privateKey } = nip19.decode(key);
    if (type !== 'nsec') {
      console.error('Invalid nsec');
      return false;
    }
    localStorageService.set(LOGIN_KEY, key);

    this.setAuthorPubkey(privateKey)
    return true
  }

  private setAuthorPubkey(privateKey: Uint8Array): void {
    let pubKey = getPublicKey(privateKey)
    authorService.pubkey = pubKey

    console.debug('[LoginService setAuthorPubkey pubkey]', pubKey)
  }

  isLoggedIn() {
    return !this.isAnonymouslyLoggedIn();
  }

  isAnonymouslyLoggedIn(): boolean {
    return this.getLogin()?.startsWith(ANONYMOUS_PREFIX) ? true : false;
  }
}

export const loginService = new LoginService()
