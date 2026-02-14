import { browser } from "$app/environment";
import { createRxNostr, now } from "rx-nostr";
import { createVerificationServiceClient, createNoopClient } from "rx-nostr-crypto";
import workerUrl from '$lib/Worker?worker&url';
import type { Event, EventParameters } from "nostr-typedef";
import { signerService } from "../services/signer.service";

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

