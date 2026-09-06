import type {
	NostrToolsAuthSigner
} from './nostr-tools-auth-signer.js';


export interface NostrToolsAuthRelay {
	auth(
		signAuthEvent:
			NostrToolsAuthSigner
	): Promise<string>;
}


export async function authenticateNostrToolsRelay(
	relay:
		NostrToolsAuthRelay,

	signAuthEvent:
		NostrToolsAuthSigner
): Promise<void> {

	await relay.auth(
		signAuthEvent
	);
}