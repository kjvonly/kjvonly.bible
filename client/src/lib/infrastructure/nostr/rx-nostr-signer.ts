import {
	now,
	type EventSigner
} from 'rx-nostr';

import type {
	Event,
	EventParameters
} from 'nostr-typedef';

import {
	Signer
} from '$lib/nostr/Signer';

export const rxNostrSigner: EventSigner = {
	getPublicKey(): Promise<string> {
		return Signer.getPublicKey();
	},

	async signEvent<K extends number>(
		params: EventParameters<K>
	): Promise<Event<K>> {
		const event =
			await Signer.signEvent({
				...params,

				tags:
					params.tags ?? [],

				created_at:
					params.created_at ??
					now()
			});

		return event as Event<K>;
	}
};