import type {
	EventTemplate,
	VerifiedEvent
} from 'nostr-tools';

import type {
	SignedNostrEvent
} from '../../domain/nostr-event.js';

import type {
	EventSigner
} from '../../ports/event-signer.js';

export type NostrToolsAuthSigner =
	(
		event:
			EventTemplate
	) => Promise<
		VerifiedEvent
	>;


export function createNostrToolsAuthSigner(
	signer:
		EventSigner
): NostrToolsAuthSigner {

	return async (
		event:
			EventTemplate
	) => {

		const signedEvent =
			await signer.sign({
				kind:
					event.kind,

				created_at:
					event.created_at,

				tags:
					event.tags.map(
						tag => [
							...tag
						]
					),

				content:
					event.content
			});


		return signedEvent as VerifiedEvent;
	};
}