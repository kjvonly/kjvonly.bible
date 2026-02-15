iCport { browser } from "$app/environment";
import { createRxBackwardReq, createRxNostr, filterByType, now, type ConnectionState } from "rx-nostr";
import { createVerificationServiceClient, createNoopClient } from "rx-nostr-crypto";
import workerUrl from '$lib/Worker?worker&url';
import type { Event, EventParameters } from "nostr-typedef";
import { signerService } from "../services/signer.service";
import { createTie } from "./RxNostrTie";
import { get, writable } from "svelte/store";
import { filterLimitItems } from "$lib/nostr/Constants";
import { sleep } from "$lib/nostr/Helper";
import { metadataStore } from "$lib/nostr/cache/Events";
import { chunk } from "../Array";

export const timeout = 5000;

export const verificationClient = browser
  ? createVerificationServiceClient({
    worker: new Worker(workerUrl, { type: 'module' }),
    timeout: 600000
  })
  : createNoopClient();
verificationClient.start();

export const rxNostr = createRxNostr({
  verifier: verificationClient.verifier,
  connectionStrategy: 'lazy-keep',
  eoseTimeout: timeout,
  okTimeout: timeout,
  retry: { strategy: 'exponential', maxCount: 5, initialDelay: 1000, polite: true },
  authenticator: 'auto',
  signer: {
    getPublicKey: () => signerService.getPublicKey(),
    signEvent: async <K extends number>(params: EventParameters<K>): Promise<Event<K>> => {
      if (params.sig) {
        return params as Event<K>;
      }

      const event = await signerService.signEvent({
        ...params,
        tags: params.tags ?? [],
        created_at: params.created_at ?? now()
      });
      return event as Event<K>;
    }
  }
}); // Based on NIP-65


//---------------------------------------------------------------------------------------------------------------------
// Relay Hints

export const [tie, seenOn] = createTie();

export function getRelayHint(id: string): string | undefined {
  return seenOn
    .get(id)
    ?.values()
    .filter((value) => value.startsWith('wss://'))
    .next().value;
}

export function getSeenOnRelays(id: string): string[] | undefined {
  const relays = seenOn.get(id);
  if (relays === undefined) {
    return undefined;
  }
  return [...relays].filter((value) => value.startsWith('wss://'));
}

//---------------------------------------------------------------------------------------------------------------------
// Connectoin State

export const connectionStates = writable(new Map<string, ConnectionState>());

rxNostr.createConnectionStateObservable().subscribe(({ from, state }) => {
  connectionStates.update((states) => states.set(from, state));
  switch (state) {
    case 'error':
    case 'rejected':
    case 'terminated': {
      console.error('[connection]', new Date().toLocaleString(), from, state);
      break;
    }
    case 'waiting-for-retrying':
    case 'retrying':
    case 'dormant': {
      console.warn('[connection]', new Date().toLocaleString(), from, state);
      break;
    }
    case 'initialized':
    case 'connecting':
    case 'connected':
    default: {
      console.debug('[connection]', new Date().toLocaleString(), from, state);
      break;
    }
  }
});

//---------------------------------------------------------------------------------------------------------------------
// Connectoin State

const observable = rxNostr.createAllMessageObservable();
observable.pipe(filterByType('NOTICE')).subscribe((packet) => {
  console.warn('[rx-nostr notice]', packet);
});
observable.pipe(filterByType('CLOSED')).subscribe((packet) => {
  console.error('[rx-nostr closed]', packet);
});

//---------------------------------------------------------------------------------------------------------------------
// REQs

const metadataReq = createRxBackwardReq();
const referencesReq = createRxBackwardReq();
const replaceableEventsReq = createRxBackwardReq();


export async function metadataReqEmit(pubkeys: string[]): Promise<void> {
  const groupedPubkeys = chunk(
    pubkeys.filter((pubkey) => !get(metadataStore).has(pubkey)),
    filterLimitItems
  );
  for (const pubkeys of groupedPubkeys) {
    console.debug('[rx-nostr metadata REQ emit]', pubkeys);
    metadataReq.emit({
      kinds: [0],
      authors: pubkeys
    });
    await sleep(0); // UI thread
  }
}

