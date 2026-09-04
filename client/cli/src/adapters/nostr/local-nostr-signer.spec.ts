import {
	verifyEvent
} from 'nostr-tools/pure';

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	LocalNostrSigner
} from './local-nostr-signer.js';


const secretKey =
	'01'.repeat(
		32
	);


describe(
	'LocalNostrSigner',
	() => {

		it(
			'signs a valid Nostr event',
			async () => {

				const signer =
					new LocalNostrSigner(
						secretKey
					);


				const event =
					await signer.sign({
						kind:
							37770,

						created_at:
							1_000,

						tags: [
							[
								'd',
								'kjvonly/test'
							]
						],

						content:
							'content'
					});


				expect(
					event.pubkey
				).toBe(
					await signer
						.getPublicKey()
				);


				expect(
					verifyEvent(
						event
					)
				).toBe(
					true
				);
			}
		);


		it(
			'requires NOSTR_SECRET_KEY',
			async () => {

				const signer =
					new LocalNostrSigner(
						undefined
					);


				await expect(
					signer.getPublicKey()
				).rejects.toThrow(
					'NOSTR_SECRET_KEY is required.'
				);
			}
		);


		it(
			'rejects an invalid secret without including it in the error',
			async () => {

				const secret =
					'this-is-not-a-key';


				const signer =
					new LocalNostrSigner(
						secret
					);


				try {
					await signer
						.getPublicKey();


					throw new Error(
						'Expected signer failure.'
					);
				}
				catch (
					error:
						unknown
				) {
					expect(
						error
					).toBeInstanceOf(
						Error
					);


					expect(
						(
							error as Error
						).message
					).not.toContain(
						secret
					);
				}
			}
		);
	}
);