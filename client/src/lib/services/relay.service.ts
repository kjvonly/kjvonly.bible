import { finalizeEvent, generateSecretKey, getPublicKey, type NostrEvent } from 'nostr-tools/pure'
import { SimplePool } from 'nostr-tools/pool'
import { getTags, KJVONLY_PUBKEY, KJVONLY_REALY_URL } from '$lib/utils/nostr';
import type { Filter, VerifiedEvent } from 'nostr-tools';
import { hexDecode, hexDecodeAndUngzip, hexEncode } from '$lib/utils/gzip';
import { Deferred } from '$lib/utils/deferred';

export class RelayService {
  subscribers: any[] = [];
  pool = new SimplePool()
  relays = [KJVONLY_REALY_URL]
  privateKey: Uint8Array | undefined;
  publicKey: string | undefined;

  atLeastOnerelayIsReady = new Deferred<string>();
  constructor() {

    // setInterval(() => {
    //   (async () => {
    //     let event = await this.pool.get(this.relays, {
    //       "#d": ["kjvs/1_1.json.gz.hex"]
    //     })
    //     console.log('async hit')
    //     if (event) {
    //       console.log('filter d', event)
    //     }
    //
    //   })();
    // }, 5000)
  }

  unsubscribe(subID: any) {
    let tmpSubscribers: any = [];
    this.subscribers.forEach((s) => {
      if (s.subID !== subID) {
        tmpSubscribers.push();
      }
    });
    this.subscribers = tmpSubscribers;
  }

  subscribe(subID: string, id: any, fn: any) {
    this.subscribers.push({ subID: subID, id: id, fn: fn });
  }

  async init() {
    let privateKeyString = localStorage.getItem('nostr-private-key')
    if (privateKeyString) {
      this.privateKey = hexDecode(privateKeyString)
    }
    if (!this.privateKey) {
      this.privateKey = generateSecretKey()
      let hexEncoded = hexEncode(this.privateKey)
      localStorage.setItem('nostr-private-key', hexEncoded)
    }
    this.publicKey = getPublicKey(this.privateKey)
    let deferred = this.atLeastOnerelayIsReady
    this.relays.forEach(url => {
      this.pool.subscribeMany([url], {
        authors: [KJVONLY_PUBKEY],
        kinds: [30002],
      }, {
        onevent(event) {
          console.log('Received event:', event);
        },
        oneose() {
          deferred.resolve('Done!')
          console.log('End of stored events (EOSE)');
        },
        onauth: this.createOnAuth(url, this.publicKey, this.privateKey),

        doauth: this.createOnAuth(url, this.publicKey, this.privateKey),
      });
    })
  }

  createOnAuth(url: string, publicKey: string, privateKey: string) {
    return async function onAuth(challenge: string): Promise<VerifiedEvent> {
      const event = {
        kind: 22242,
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['relay', url],
          ['challenge', challenge.tags.find(t => t[0] === 'challenge')?.[1]]
        ],
        content: ''
      };
      return finalizeEvent(event, privateKey);
    };
  }

  getFullExtension(path: string): string {
    const filename = path.split(/[/\\\\]/).pop() || '';
    const firstDotIndex = filename.indexOf('.');
    return firstDotIndex >= 0 ? filename.slice(firstDotIndex) : '';
  };

  async getEvents(filter: Filter): Promise<NostrEvent[] | null> {
    await this.atLeastOnerelayIsReady.promise
    return await this.pool.querySync(
      this.relays,
      filter,
      {
        onclose() {
          console.log('End of stored events (EOSE)');
        },
        onauth: this.createOnAuth(KJVONLY_REALY_URL, this.publicKey, this.privateKey),

        doauth: this.createOnAuth(KJVONLY_REALY_URL, this.publicKey, this.privateKey),
      }
    )
  }

  async getContents(filter: Filter): Promise<string[]> {
    let events = await this.getEvents(filter)
    let contents = []
    if (events) {
      for (let e of events) {
        let content = await this.decodeContent(e)
        contents.push(content)

      }
    }
    return contents
  }

  async getEvent(filter: Filter): Promise<NostrEvent | null> {
    await this.atLeastOnerelayIsReady.promise
    return await this.pool.get(
      this.relays,
      filter,
    )
  }

  async getContent(filter: Filter): Promise<any> {
    const event = await this.getEvent(filter)
    if (!event) {
      return
    }
    return this.decodeContent(event)
  }

  async decodeContent(event: NostrEvent): Promise<string> {
    let content = ''
    let mimes = getTags(event, 'm')
    if (mimes.length > 0) {
      let mime = mimes[0]
      switch (mime) {
        case 'json.gz.hex':
          content = await hexDecodeAndUngzip(event.content)
          break;
      }
    }
    return content
  }

  // NOTE: if a promise is rejected in pool.publish the 
  // caller is responsible for catching the error.
  async publishEvent(event: NostrEvent): Promise<void> {
    const signedEvent = finalizeEvent(event, this.privateKey);
    // force an error to test logic
    // let results = await Promise.all([...this.pool.publish(this.relays, signedEvent), Promise.reject('test issue')])
    await Promise.all(this.pool.publish(this.relays, signedEvent))

  }
}

export let relayService = new RelayService();
