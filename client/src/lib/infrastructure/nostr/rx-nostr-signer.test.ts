import {
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	Event
} from 'nostr-typedef';

vi.mock(
	'$lib/nostr/Signer',
	() => ({
		Signer: {
			getPublicKey:
				vi.fn(),

			signEvent:
				vi.fn()
		}
	})
);

import {
	Signer
} from '$lib/nostr/Signer';

import {
	rxNostrSigner
} from './rx-nostr-signer';

describe(
	'rxNostrSigner',
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.restoreAllMocks();
		});

		it(
			'gets the public key from the application signer',
			async () => {
				const pubkey =
					'a'.repeat(64);

				vi.mocked(
					Signer.getPublicKey
				).mockResolvedValue(
					pubkey
				);

				const result =
					await rxNostrSigner
						.getPublicKey();

				expect(
					result
				).toBe(
					pubkey
				);

				expect(
					Signer.getPublicKey
				).toHaveBeenCalledOnce();
			}
		);

		it(
			'signs event parameters with the application signer',
			async () => {
				const signedEvent = {
					id:
						'a'.repeat(64),

					pubkey:
						'b'.repeat(64),

					sig:
						'c'.repeat(128),

					kind:
						37770,

					tags: [
						[
							'd',
							'bible/kjv/43_3'
						]
					],

					content:
						'{}',

					created_at:
						100
				} satisfies Event;

				vi.mocked(
					Signer.signEvent
				).mockResolvedValue(
					signedEvent
				);

				const result =
					await rxNostrSigner
						.signEvent({
							kind:
								37770,

							tags: [
								[
									'd',
									'bible/kjv/43_3'
								]
							],

							content:
								'{}',

							created_at:
								100
						});

				expect(
					Signer.signEvent
				).toHaveBeenCalledWith({
					kind:
						37770,

					tags: [
						[
							'd',
							'bible/kjv/43_3'
						]
					],

					content:
						'{}',

					created_at:
						100
				});

				expect(
					result
				).toBe(
					signedEvent
				);
			}
		);

		it(
			'provides missing tags and created_at before signing',
			async () => {
				vi.spyOn(
					Date,
					'now'
				).mockReturnValue(
					100_000
				);

				const signedEvent = {
					id:
						'a'.repeat(64),

					pubkey:
						'b'.repeat(64),

					sig:
						'c'.repeat(128),

					kind:
						37770,

					tags:
						[],

					content:
						'{}',

					created_at:
						100
				} satisfies Event;

				vi.mocked(
					Signer.signEvent
				).mockResolvedValue(
					signedEvent
				);

				await rxNostrSigner
					.signEvent({
						kind:
							37770,

						content:
							'{}'
					});

				expect(
					Signer.signEvent
				).toHaveBeenCalledWith({
					kind:
						37770,

					content:
						'{}',

					tags:
						[],

					created_at:
						100
				});
			}
		);
	}
);