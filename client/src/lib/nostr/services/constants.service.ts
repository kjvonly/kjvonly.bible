export interface Relay {
  url: string
  read: boolean
  write: boolean
}

export class ConstantsService {

  constructor() {
    this.setDefaultRelays();
  }
  defaultRelays: Relay[] = [

  ];

  setDefaultRelays() {
    this.defaultRelays = `${import.meta.env.VITE_NOSTR_COMMA_DELIMITED_RELAY_URLS}`.split(',').map((relayUrl: string) => {
      return {
        url: relayUrl,
        read: true,
        write: true
      }
    })

  }
}

export const constantsService = new ConstantsService();
