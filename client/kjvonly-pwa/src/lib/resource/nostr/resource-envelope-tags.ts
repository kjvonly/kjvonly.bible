/**
 * Nostr tags owned by the generic Resource event envelope.
 *
 * Resource metadata may use any other scalar tag name. Keeping this set in one
 * place ensures inbound metadata filtering and outbound publication reserve the
 * same protocol fields.
 */
export const RESOURCE_ENVELOPE_TAGS =
	new Set([
		'd',
		'm',
		't',
		'representation'
	]);
