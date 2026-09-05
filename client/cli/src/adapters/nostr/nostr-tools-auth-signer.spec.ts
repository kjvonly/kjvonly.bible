import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	createNostrToolsAuthSigner
} from './nostr-tools-auth-signer.js';

import type {
	EventSigner
} from '../../ports/event-signer.js';


describe(
	'createNostrToolsAuthSigner',
	() => {

		it(
			'signs the Nostr Tools auth template with the application signer',
			async () => {

				const signedEvent = {
					id:
						'a'.repeat(
							64
						),

					pubkey:
						'b'.repeat(
							64
						),

					created_at:
						1000,

					kind:
						22242,

					tags: [
						[
							'relay',
							'wss://relay.example'
						],
						[
							'challenge',
							'challenge-value'
						]
					],

					content:
						'',

					sig:
						'c'.repeat(
							128
						)
				};


				const sign =
					vi.fn(
						async () =>
							signedEvent
					);


				const signer:
					EventSigner = {
						getPublicKey:
							vi.fn(
								async () =>
									signedEvent.pubkey
							),

						sign
					};


				const authSigner =
					createNostrToolsAuthSigner(
						signer
					);


				const result =
					await authSigner({
						kind:
							22242,

						created_at:
							1000,

						tags: [
							[
								'relay',
								'wss://relay.example'
							],
							[
								'challenge',
								'challenge-value'
							]
						],

						content:
							''
					});


				expect(
					sign
				).toHaveBeenCalledWith({
					kind:
						22242,

					created_at:
						1000,

					tags: [
						[
							'relay',
							'wss://relay.example'
						],
						[
							'challenge',
							'challenge-value'
						]
					],

					content:
						''
				});


				expect(
					result
				).toBe(
					signedEvent
				);
			}
		);
	}
);