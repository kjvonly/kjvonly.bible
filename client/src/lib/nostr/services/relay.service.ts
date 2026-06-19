import { finalizeEvent, generateSecretKey, getPublicKey, type NostrEvent } from 'nostr-tools/pure'
import { SimplePool } from 'nostr-tools/pool'
import { getTags, KJVONLY_PUBKEY, KJVONLY_REALY_URL } from '$lib/utils/nostr';
import type { Event, EventTemplate, Filter, UnsignedEvent, VerifiedEvent } from 'nostr-tools';
import { hexDecode, hexDecodeAndUngzip, hexEncode } from '$lib/utils/gzip';
import { Deferred } from '$lib/utils/deferred';
import { signerService } from './signer.service';
import { authorService } from './author.service';
import { createRxBackwardReq, uniq, type EventPacket } from 'rx-nostr';
import { rxNostr, tie } from '../timelines/MainTimeline';
import type { EventParameters } from 'nostr-typedef';

// TODO MUST VALIDATE
export class RelayService {
  subscribers: any[] = [];
  pool = new SimplePool()
  relays = [KJVONLY_REALY_URL]

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
        onauth: this.createOnAuth(url),

        doauth: this.createOnAuth(url),
      });
    })
  }

  createOnAuth(url: string) {
    return async (et: EventTemplate): Promise<VerifiedEvent> => {
      const unsignedEvent: UnsignedEvent = {
        kind: 22242,
        pubkey: authorService.pubkey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['relay', url],
          ['challenge', et.tags.find(t => t[0] === 'challenge')?.[1] || '']
        ],
        content: ''
      };

      // TODO - SUPPORT OTHER SIGNING OPTIONS
      return signerService.signEvent(unsignedEvent)
    };
  }

  getFullExtension(path: string): string {
    const filename = path.split(/[/\\\\]/).pop() || '';
    const firstDotIndex = filename.indexOf('.');
    return firstDotIndex >= 0 ? filename.slice(firstDotIndex) : '';
  };

  async getEvents(filter: Filter): Promise<NostrEvent[] | null> {
    let events: any = [];
    await new Promise<void>((resolve, reject) => {
      const rxReq = createRxBackwardReq();
      rxNostr
        .use(rxReq)
        .pipe(
          tie,
          uniq()
        )
        .subscribe({
          next: (packet) => {
            // console.log("Received:", packet);
            // events.push(packet.event);
            console.log('[rx packet]', packet.type, packet);

            if (packet.event) {
              events.push(packet.event);
            }
          },
          complete: () => {
            console.log('[relay service getEvents complete]', filter);
            resolve()
          },
          error: (error) => {
            console.error('[relay service get events error]', filter, error);
            reject()
          }
        });

      rxReq.emit(filter);
      rxReq.over()
    })

    return events
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
    // await this.atLeastOnerelayIsReady.promise
    // return await this.pool.get(
    //   this.relays,
    //   filter,
    // )
    let events = await this.getEvents(filter)
    if (events && events.length > 0) {
      return events[0]
    }
    return null
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
  async publishEvent(event: NostrEvent | UnsignedEvent | EventParameters): Promise<any> {
    rxNostr.send(event).subscribe((packet) => {
      console.log(
        `Sending to ${packet.from} ${packet.ok ? "succeeded" : "failed"}.`,
      );
    });
    return event
  }
}

export let relayService = new RelayService();
