import type {
	SignedNostrEvent
} from './nostr-event.js';


export function parseSignedNostrEvent(
	value:
		unknown
): SignedNostrEvent {

	if (
		typeof value !==
			'object' ||
		value === null
	) {
		throw invalidEvent();
	}


	const event =
		value as Record<
			string,
			unknown
		>;


	if (
		typeof event.id !==
			'string' ||
		!/^[0-9a-f]{64}$/
			.test(
				event.id
			) ||
		typeof event.pubkey !==
			'string' ||
		!/^[0-9a-f]{64}$/
			.test(
				event.pubkey
			) ||
		typeof event.sig !==
			'string' ||
		!/^[0-9a-f]{128}$/
			.test(
				event.sig
			) ||
		!Number.isInteger(
			event.created_at
		) ||
		!Number.isInteger(
			event.kind
		) ||
		typeof event.content !==
			'string' ||
		!isTags(
			event.tags
		)
	) {
		throw invalidEvent();
	}


	return {
		id:
			event.id,

		pubkey:
			event.pubkey,

		created_at:
			event.created_at as number,

		kind:
			event.kind as number,

		tags:
			event.tags,

		content:
			event.content,

		sig:
			event.sig
	};
}


function isTags(
	value:
	unknown
): value is string[][] {

	return (
		Array.isArray(
			value
		) &&
		value.every(
			tag =>
				Array.isArray(
					tag
				) &&
				tag.every(
					item =>
						typeof item ===
							'string'
				)
		)
	);
}


function invalidEvent():
	Error {

	return new Error(
		'Invalid staged signed Nostr event.'
	);
}