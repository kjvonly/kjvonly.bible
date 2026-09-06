import {
	describe,
	expect,
	it,
	vi
} from 'vitest';


import {
	NostrToolsEventPublisher
} from './nostr-tools-event-publisher.js';
import { Logger } from '#ports/logging/logger.js';
import { EventSigner } from '#ports/nostr/event-signer.js';


function createSigner():
	EventSigner {

	return {
		getPublicKey:
			vi.fn(
				async () =>
					'b'.repeat(
						64
					)
			),

		sign:
			vi.fn()
	};
}


function createLogger():
	Logger {

	return {
		verbose:
			vi.fn()
	};
}


function createEvent() {

	return {
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
			37770,

		tags: [
			[
				'd',
				'kjvonly/test/1_1'
			]
		],

		content:
			'content',

		sig:
			'c'.repeat(
				128
			)
	};
}


describe(
	'NostrToolsEventPublisher',
	() => {

		it(
			'publishes the exact signed event with native auth support and closes the pool relay',
			async () => {

				const event =
					createEvent();


				const publish =
					vi.fn(
						() => [
							Promise.resolve(
								'published'
							)
						]
					);


				const close =
					vi.fn();


				const pool = {
					publish,
					close
				};


				const logger =
					createLogger();


				const publisher =
					new NostrToolsEventPublisher(
						createSigner(),
						logger,
						() =>
							pool
					);


				await publisher.publish(
					'wss://relay.example',
					event
				);


				expect(
					publish
				).toHaveBeenCalledOnce();


				expect(
					publish
				).toHaveBeenCalledWith(
					[
						'wss://relay.example'
					],
					event,
					{
						onauth:
							expect.any(
								Function
							)
					}
				);


				expect(
					close
				).toHaveBeenCalledWith([
					'wss://relay.example'
				]);


				expect(
					logger.verbose
				).toHaveBeenCalledWith(
					'nostr.event.transport.start',
					{
						relay:
							'wss://relay.example',

						eventId:
							event.id
					}
				);


				expect(
					logger.verbose
				).toHaveBeenCalledWith(
					'nostr.event.transport.complete',
					{
						relay:
							'wss://relay.example',

						eventId:
							event.id
					}
				);
			}
		);


		it(
			'closes the pool relay when publication is rejected',
			async () => {

				const event =
					createEvent();


				const publish =
					vi.fn(
						() => [
							Promise.reject(
								new Error(
									'blocked: event rejected'
								)
							)
						]
					);


				const close =
					vi.fn();


				const pool = {
					publish,
					close
				};


				const logger =
					createLogger();


				const publisher =
					new NostrToolsEventPublisher(
						createSigner(),
						logger,
						() =>
							pool
					);


				await expect(
					publisher.publish(
						'wss://relay.example',
						event
					)
				).rejects.toThrow(
					'blocked: event rejected'
				);


				expect(
					close
				).toHaveBeenCalledWith([
					'wss://relay.example'
				]);


				expect(
					logger.verbose
				).toHaveBeenCalledWith(
					'nostr.event.transport.failed',
					{
						relay:
							'wss://relay.example',

						eventId:
							event.id,

						error:
							'blocked: event rejected'
					}
				);
			}
		);
	}
);
