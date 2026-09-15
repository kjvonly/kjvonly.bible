import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	NostrClient
} from '$lib/infrastructure/nostr/client/nostr-client';

import {
	NostrEventPublicationStrategy
} from './nostr-event-publication-strategy';

describe(
	'NostrEventPublicationStrategy',
	() => {
		it(
			'publishes a Nostr event publication through NostrClient',
			async () => {
				const getPublicKey =
					vi.fn()
						.mockResolvedValue(
							'publisher'
						);

				const publishEvent =
					vi.fn()
						.mockResolvedValue({
							eventId:
								'event-id',
							acknowledgements: [],
							acceptedByAnyRelay:
								true
						});

				const publisher =
					new NostrEventPublicationStrategy(
						createNostrClient({
							getPublicKey,
							publishEvent
						})
					);

				await publisher.publish({
					type:
						'nostr-event',
					publisher:
						'publisher',
					event: {
						kind:
							0,
						content:
							'{"name":"Stephen"}',
						tags: []
					}
				});

				expect(
					getPublicKey
				).toHaveBeenCalledTimes(
					1
				);

				expect(
					publishEvent
				).toHaveBeenCalledWith({
					kind:
						0,
					content:
						'{"name":"Stephen"}',
					tags: []
				});
			}
		);

		it(
			'rejects publication when the active signer does not match the publisher',
			async () => {
				const publishEvent =
					vi.fn();

				const publisher =
					new NostrEventPublicationStrategy(
						createNostrClient({
							getPublicKey:
								vi.fn()
									.mockResolvedValue(
										'other-publisher'
									),
							publishEvent
						})
					);

				await expect(
					publisher.publish({
						type:
							'nostr-event',
						publisher:
							'publisher',
						event: {
							kind:
								0,
							content:
								'',
							tags: []
						}
					})
				).rejects.toThrow(
					'Nostr event publisher does not match configured signer: publisher'
				);

				expect(
					publishEvent
				).not.toHaveBeenCalled();
			}
		);

		it(
			'leaves relay rejection as a publication failure',
			async () => {
				const publisher =
					new NostrEventPublicationStrategy(
						createNostrClient({
							publishEvent:
								vi.fn()
									.mockResolvedValue({
										eventId:
											'event-id',
										acknowledgements: [],
										acceptedByAnyRelay:
											false
									})
						})
					);

				await expect(
					publisher.publish({
						type:
							'nostr-event',
						publisher:
							'publisher',
						event: {
							kind:
								0,
							content:
								'',
							tags: []
						}
					})
				).rejects.toThrow(
					'Nostr event publication was rejected by all configured relays.'
				);
			}
		);
	}
);

function createNostrClient(
	overrides: Partial<
		Pick<
			NostrClient,
			'getPublicKey' |
				'publishEvent'
		>
	> = {}
): Pick<
	NostrClient,
	'getPublicKey' |
		'publishEvent'
> {
	return {
		getPublicKey:
			vi.fn()
				.mockResolvedValue(
					'publisher'
				),

		publishEvent:
			vi.fn()
				.mockResolvedValue({
					eventId:
						'event-id',
					acknowledgements: [],
					acceptedByAnyRelay:
						true
				}),

		...overrides
	};
}
