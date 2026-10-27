import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	NostrEventsService
} from './nostr-events.service';

import type {
	NostrEvent
} from '$lib/infrastructure/nostr/events/models/nostr-event';

function createService(
	overrides: {
		getByKindAndPubkey?: ReturnType<typeof vi.fn>;
		put?: ReturnType<typeof vi.fn>;
		run?: ReturnType<typeof vi.fn>;
		create?: ReturnType<typeof vi.fn>;
		wake?: ReturnType<typeof vi.fn>;
	} = {}
) {
	const put =
		overrides.put ??
		vi.fn()
			.mockResolvedValue(
				undefined
			);

	const run =
		overrides.run ??
		vi.fn();

	const create =
		overrides.create ??
		vi.fn();

	const wake =
		overrides.wake ??
		vi.fn();

	const getByKindAndPubkey =
		overrides.getByKindAndPubkey ??
		vi.fn()
			.mockResolvedValue(
				undefined
			);

	return {
		service:
			new NostrEventsService(
				{
					get:
						vi.fn(),
					getByKindAndPubkey,
					put
				},
				{ run },
				{ create },
				{ wake }
			),
		put,
		run,
		create,
		wake,
		getByKindAndPubkey
	};
}

describe(
	'NostrEventsService',
	() => {
		it(
			'caches a verified signed Nostr event without queueing publication',
			async () => {
				const {
					service,
					put,
					run,
					wake
				} = createService();

				await service.cache({
					id:
						'event-id',
					pubkey:
						'user-id',
					created_at: 10,
					kind: 0,
					content:
						'{"name":"Stephen"}',
					tags: [],
					sig:
						'signature'
				});

				expect(put)
					.toHaveBeenCalledWith({
						key:
							'nostr/event:0:user-id',
						pubkey:
							'user-id',
						kind: 0,
						content:
							'{"name":"Stephen"}',
						tags: [],
						created_at: 10,
						id:
							'event-id',
						sig:
							'signature'
					});

				expect(run)
					.not.toHaveBeenCalled();

				expect(wake)
					.not.toHaveBeenCalled();
			}
		);

		it(
			'preserves a different locally-authored unsigned event during refresh',
			async () => {
				const put =
					vi.fn();

				const {
					service
				} = createService({
					put,
					getByKindAndPubkey:
						vi.fn()
							.mockResolvedValue({
								key:
									'nostr/event:0:user-id',
								pubkey:
									'user-id',
								kind: 0,
								content:
									'{"name":"Local"}',
								tags: []
							})
				});

				await service.cache({
					id:
						'event-id',
					pubkey:
						'user-id',
					created_at: 10,
					kind: 0,
					content:
						'{"name":"Relay"}',
					tags: [],
					sig:
						'signature'
				});

				expect(put)
					.not.toHaveBeenCalled();
			}
		);

		it(
			'replaces an unsigned local event when the signed relay event has the same payload',
			async () => {
				const put =
					vi.fn()
						.mockResolvedValue(
							undefined
						);

				const {
					service
				} = createService({
					put,
					getByKindAndPubkey:
						vi.fn()
							.mockResolvedValue({
								key:
									'nostr/event:0:user-id',
								pubkey:
									'user-id',
								kind: 0,
								content:
									'{"name":"Stephen"}',
								tags: []
							})
				});

				await service.cache({
					id:
						'event-id',
					pubkey:
						'user-id',
					created_at: 10,
					kind: 0,
					content:
						'{"name":"Stephen"}',
					tags: [],
					sig:
						'signature'
				});

				expect(put)
					.toHaveBeenCalledOnce();
			}
		);

		it(
			'persists the event and publication before waking Outbox',
			async () => {
				const event =
					createEvent();

				const publication = {
					type:
						'nostr-event',

					publisher:
						'user-id',
					event: {
						kind: 0,
						content:
							'{}',
						tags: []
					}
				};

				const eventsPut =
					vi.fn()
						.mockResolvedValue(
							undefined
						);

				const outboxPut =
					vi.fn()
						.mockResolvedValue(
							undefined
						);

				const run =
					vi.fn(
						async (
							operation
						) =>
							await operation({
								events: {
									put:
										eventsPut
								},
								outbox: {
									put:
										outboxPut
								}
							})
					);

				const wake =
					vi.fn();

				const service =
					new NostrEventsService(
						{
							get:
								vi.fn(),
							getByKindAndPubkey:
								vi.fn(),
							put:
								vi.fn()
						},
						{ run },
						{
							create:
								vi.fn()
									.mockReturnValue(
										publication
									)
						},
						{ wake }
					);

				await service.put(
					event
				);

				expect(eventsPut)
					.toHaveBeenCalledWith(
						event
					);

				expect(outboxPut)
					.toHaveBeenCalledWith(
						event.key,
						publication
					);

				expect(wake)
					.toHaveBeenCalledTimes(1);
			}
		);

		it(
			'does not wake Outbox when the local write transaction fails',
			async () => {
				const error =
					new Error(
						'write failed'
					);

				const wake =
					vi.fn();

				const service =
					new NostrEventsService(
						{
							get:
								vi.fn(),
							getByKindAndPubkey:
								vi.fn(),
							put:
								vi.fn()
						},
						{
							run:
								vi.fn()
									.mockRejectedValue(
										error
									)
						},
						{
							create:
								vi.fn()
									.mockReturnValue({
										type:
											'nostr-event',

										publisher:
											'user-id',
										event: {
											kind: 0,
											content: '{}',
											tags: []
										}
									})
						},
						{ wake }
					);

				await expect(
					service.put(
						createEvent()
					)
				).rejects.toBe(
					error
				);

				expect(wake)
					.not.toHaveBeenCalled();
			}
		);
	}
);

function createEvent():
	NostrEvent {
	return {
		key:
			'nostr/event:0:user-id',
		pubkey:
			'user-id',
		kind: 0,
		content:
			'{}',
		tags: []
	};
}
