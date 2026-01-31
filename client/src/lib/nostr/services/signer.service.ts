import { type EventTemplate, type UnsignedEvent, type Event, nip19, finalizeEvent } from "nostr-tools";
import { loginService } from "./login.service";

class SignerService {

  public async signEvent(unsignedEvent: EventTemplate | UnsignedEvent): Promise<Event> {
    const login = loginService.getLogin()
    if (login?.startsWith('nsec')) {
      const { data: seckey } = nip19.decode(login);
      return finalizeEvent(unsignedEvent, seckey as Uint8Array);
    } else {
      throw new Error('[SignerService.signEvent logic error]');
    }
  }
}

export const signerService = new SignerService();
