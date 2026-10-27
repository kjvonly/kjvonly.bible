export interface NostrEvent {
	readonly key:
		string;

	readonly pubkey:
		string;

	readonly kind:
		number;

	readonly content:
		string;

	readonly tags:
		readonly (
			readonly string[]
		)[];

	readonly created_at?:
		number;

	readonly id?:
		string;

	readonly sig?:
		string;
}

export function createReplaceableNostrEventKey(
	kind: number,
	pubkey: string
): string {
	return `nostr/event:${kind}:${pubkey}`;
}
