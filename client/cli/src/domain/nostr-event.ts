export interface UnsignedNostrEvent {
	readonly kind:
		number;

	readonly created_at:
		number;

	readonly tags:
		string[][];

	readonly content:
		string;
}


export interface SignedNostrEvent {
	readonly id:
		string;

	readonly pubkey:
		string;

	readonly created_at:
		number;

	readonly kind:
		number;

	readonly tags:
		string[][];

	readonly content:
		string;

	readonly sig:
		string;
}