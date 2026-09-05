import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	authenticateNostrToolsRelay
} from './authenticate-nostr-tools-relay.js';

import type {
	NostrToolsAuthSigner
} from './nostr-tools-auth-signer.js';


describe(
	'authenticateNostrToolsRelay',
	() => {

		it(
			'authenticates using the supplied signer',
			async () => {

				const signAuthEvent:
					NostrToolsAuthSigner =
						vi.fn();


				const auth =
					vi.fn(
						async (
							signer:
								NostrToolsAuthSigner
						) => {

							expect(
								signer
							).toBe(
								signAuthEvent
							);


							return 'authenticated';
						}
					);


				await authenticateNostrToolsRelay(
					{
						auth
					},
					signAuthEvent
				);


				expect(
					auth
				).toHaveBeenCalledOnce();
			}
		);
	}
);