export class Author {

  constructor(private pubkey: string) { }

  public async fetchRelays() {
    // const relayEvents = await RelayList.fetchEvents(this.pubkey);
    // console.log('[relay events]', relayEvents);
    //
    // RelayList.apply(relayEvents);
  }

  public async fetchEvents(): Promise<void> {

  }
}

