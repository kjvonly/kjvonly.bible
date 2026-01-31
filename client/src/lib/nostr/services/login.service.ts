import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools"
import { localStorageService } from "./localStorage.service"
import { authorService } from "./author.service"


export class LoginService {

  LOGIN_KEY: string = 'login'
  ANONYMOUS_LOGIN_KEY = 'anonymous-login'

  init(): void {
    this.initAnonymous()
    this.initSavedLogin()
  }

  initAnonymous() {
    if (!this.isLoggedIn() || !this.isAnonymouslyLoggedIn()) {
      this.withAnonymous()
    }
  }

  initSavedLogin() {
    let savedLogin = this.getLogin()
    if (savedLogin.startsWith("nsec")) {
      this.withNsec(savedLogin)
    }
  }

  withAnonymous() {
    let privateKey = generateSecretKey()
    let nsec = nip19.nsecEncode(privateKey)
    localStorageService.set(this.ANONYMOUS_LOGIN_KEY, nsec)
  }

  getLogin(): string | null {
    if (this.isLoggedIn()) {
      return localStorageService.get(this.LOGIN_KEY)
    } else {
      return localStorageService.get(this.ANONYMOUS_LOGIN_KEY)
    }
  }

  withNsec(key: string): boolean {
    console.debug('[LoginService withNsec]')

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

    console.debug('[LoginService setAuthorPubkey pubkey]', pubKey)
  }


  isLoggedIn() {
    return localStorageService.get(this.LOGIN_KEY) ? true : false
  }

  isAnonymouslyLoggedIn(): boolean {
    return localStorageService.get(this.ANONYMOUS_LOGIN_KEY) ? true : false
  }
}

export const loginService = new LoginService()
