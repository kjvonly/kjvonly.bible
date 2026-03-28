import { type EventTemplate, type UnsignedEvent, type Event, nip19, finalizeEvent, getPublicKey } from "nostr-tools";
import { ANONYMOUS_PREFIX, loginService } from "./login.service";
import { localStorageService } from "./localStorage.service";

class SignerService {

  public async getPublicKey(): Promise<string> {
    const login = localStorageService.get('login');
    if (login === null || login.startsWith('npub')) {
      throw new Error('[logic error]');
    }

    if (login.startsWith('nsec')) {
      const { data: seckey } = nip19.decode(login);
      return getPublicKey(seckey as Uint8Array);
    } else {
      throw new Error('[logic error]');
    }
  }

  public async signEvent(unsignedEvent: EventTemplate | UnsignedEvent): Promise<Event> {
    const login = loginService.getLogin()
    if (login?.startsWith(ANONYMOUS_PREFIX)) {

      const nsec = login.replace(ANONYMOUS_PREFIX, '')
      const { data: seckey } = nip19.decode(nsec);
      return finalizeEvent(unsignedEvent, seckey as Uint8Array);

    } else if (login?.startsWith('nsec')) {
      const { data: seckey } = nip19.decode(login);
      return finalizeEvent(unsignedEvent, seckey as Uint8Array);
    } else {
      throw new Error('[SignerService.signEvent logic error]');
    }
  }
}

export const signerService = new SignerService();
