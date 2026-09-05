import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	NostrToolsEventPublisher
} from './nostr-tools-event-publisher.js';


describe(
	'NostrToolsEventPublisher',
	() => {

		it(
			'publishes the exact signed event and closes the relay',
			async () => {

				const event = {
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

					tags:
						[
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


				const publish =
					vi.fn(
						async () =>
							'published'
					);


				const close =
					vi.fn();


				const relay = {
					prepareSubscription:
						vi.fn(),

					send:
						vi.fn(),

					publish,

					close
				};


				const connectRelay =
					vi.fn(
						async () =>
							relay
					);


				const publisher =
					new NostrToolsEventPublisher(
						connectRelay
					);


				await publisher.publish(
					'wss://relay.example',
					event
				);


				expect(
					connectRelay
				).toHaveBeenCalledWith(
					'wss://relay.example'
				);


				expect(
					publish
				).toHaveBeenCalledOnce();


				expect(
					publish
				).toHaveBeenCalledWith(
					event
				);


				expect(
					close
				).toHaveBeenCalledOnce();
			}
		);
	}
);