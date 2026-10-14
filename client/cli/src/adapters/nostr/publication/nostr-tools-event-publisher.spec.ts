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
			'publishes the exact signed event with native auth and closes at batch end',
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


				expect(close).not.toHaveBeenCalled();
				publisher.close('wss://relay.example');
				expect(close).toHaveBeenCalledWith(['wss://relay.example']);


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
			'does not retry an explicit relay rejection and closes at batch end',
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


				expect(publish).toHaveBeenCalledOnce();
				expect(close).not.toHaveBeenCalled();
				publisher.close('wss://relay.example');
				expect(close).toHaveBeenCalledWith(['wss://relay.example']);


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
							'blocked: event rejected',

						attempt: 1,
						maxAttempts: 3
					}
				);
			}
		);

		it('reuses one pool for sequential events and closes it once', async () => {
			const publish = vi.fn(() => [Promise.resolve('ok')]);
			const close = vi.fn();
			const createPool = vi.fn(() => ({ publish, close }));
			const publisher = new NostrToolsEventPublisher(
				createSigner(), createLogger(), createPool
			);
			const event = createEvent();
			await publisher.publish('wss://relay.example', event);
			await publisher.publish('wss://relay.example', { ...event, id: 'd'.repeat(64) });

			expect(createPool).toHaveBeenCalledOnce();
			expect(publish).toHaveBeenCalledTimes(2);
			expect(close).not.toHaveBeenCalled();
			publisher.close('wss://relay.example');
			publisher.close('wss://relay.example');
			expect(close).toHaveBeenCalledOnce();
		});

		it('reconnects and retries the same signed event after a timeout', async () => {
			const firstPublish = vi.fn(() => [Promise.reject(
				new Error('connection failure: connection timed out')
			)]);
			const secondPublish = vi.fn(() => [Promise.resolve('ok')]);
			const firstClose = vi.fn();
			const secondClose = vi.fn();
			const pools = [
				{ publish: firstPublish, close: firstClose },
				{ publish: secondPublish, close: secondClose }
			];
			const createPool = vi.fn(() => pools.shift()!);
			const wait = vi.fn(async (_milliseconds: number) => {});
			const logger = createLogger();
			const publisher = new NostrToolsEventPublisher(
				createSigner(), logger, createPool, wait
			);
			const event = createEvent();

			await publisher.publish('wss://relay.example', event);
			expect(firstPublish).toHaveBeenCalledWith(
				['wss://relay.example'], event, { onauth: expect.any(Function) }
			);
			expect(secondPublish).toHaveBeenCalledWith(
				['wss://relay.example'], event, { onauth: expect.any(Function) }
			);
			expect(firstClose).toHaveBeenCalledOnce();
			expect(secondClose).not.toHaveBeenCalled();
			expect(createPool).toHaveBeenCalledTimes(2);
			expect(wait).toHaveBeenCalledWith(1000);
			expect(logger.verbose).toHaveBeenCalledWith(
				'nostr.event.transport.retry',
				{
					relay: 'wss://relay.example',
					eventId: event.id,
					attempt: 2,
					delayMs: 1000,
					error: 'connection failure: connection timed out'
				}
			);
			publisher.close('wss://relay.example');
			expect(secondClose).toHaveBeenCalledOnce();
		});

		it('retries HTTP 504 and preserves the signed event', async () => {
			const firstPublish = vi.fn(() => [Promise.reject(
				new Error('Unexpected server response: 504')
			)]);
			const secondPublish = vi.fn(() => [Promise.resolve('ok')]);
			const pools = [
				{ publish: firstPublish, close: vi.fn() },
				{ publish: secondPublish, close: vi.fn() }
			];
			const createPool = vi.fn(() => pools.shift()!);
			const wait = vi.fn(async (_milliseconds: number) => {});
			const publisher = new NostrToolsEventPublisher(
				createSigner(), createLogger(), createPool, wait
			);
			const event = createEvent();

			await publisher.publish('wss://relay.example', event);
			expect(createPool).toHaveBeenCalledTimes(2);
			expect(firstPublish).toHaveBeenCalledWith(
				['wss://relay.example'], event, { onauth: expect.any(Function) }
			);
		expect(secondPublish).toHaveBeenCalledWith(
				['wss://relay.example'], event, { onauth: expect.any(Function) }
			);
			expect(wait).toHaveBeenCalledWith(1000);
			publisher.close('wss://relay.example');
		});

		it('does not retry a permanent HTTP 403 handshake rejection', async () => {
			const createPool = vi.fn(() => ({
				publish: () => [Promise.reject(new Error('Unexpected server response: 403'))],
				close: vi.fn()
			}));
			const wait = vi.fn(async (_milliseconds: number) => {});
			const publisher = new NostrToolsEventPublisher(
				createSigner(), createLogger(), createPool, wait
			);
			await expect(publisher.publish('wss://relay.example', createEvent()))
				.rejects.toThrow('Unexpected server response: 403');
			expect(createPool).toHaveBeenCalledOnce();
			expect(wait).not.toHaveBeenCalled();
			publisher.close('wss://relay.example');
		});

		it('retries even when disposal of the broken pool throws', async () => {
			const first = {
				publish: () => [Promise.reject('connection failure: connection timed out')],
				close: vi.fn(() => { throw new Error('socket cleanup failed'); })
			};
			const second = {
				publish: () => [Promise.resolve('ok')],
				close: vi.fn()
			};
			const pools = [first, second];
			const logger = createLogger();
			const publisher = new NostrToolsEventPublisher(
				createSigner(), logger, () => pools.shift()!,
				async () => {}
			);
			await publisher.publish('wss://relay.example', createEvent());
			expect(first.close).toHaveBeenCalledOnce();
			expect(logger.verbose).toHaveBeenCalledWith(
				'nostr.event.transport.close.failed', expect.objectContaining({
					error: 'socket cleanup failed'
				})
			);
			publisher.close('wss://relay.example');
		});

		it('reports string rejection failures as Error instances', async () => {
			const publisher = new NostrToolsEventPublisher(
				createSigner(), createLogger(),
				() => ({
					publish: () => [Promise.reject('blocked: event rejected')],
					close: vi.fn()
				})
			);
			await expect(publisher.publish('wss://relay.example', createEvent()))
				.rejects.toThrow('blocked: event rejected');
			publisher.close('wss://relay.example');
		});

		it('stops after three transient failures with bounded backoff', async () => {
			const closes: ReturnType<typeof vi.fn>[] = [];
			const createPool = vi.fn(() => {
				const close = vi.fn();
				closes.push(close);
				return {
					publish: () => [Promise.reject(new Error('ECONNRESET'))],
					close
				};
			});
			const wait = vi.fn(async (_milliseconds: number) => {});
			const publisher = new NostrToolsEventPublisher(
				createSigner(), createLogger(), createPool, wait
			);
			await expect(publisher.publish('wss://relay.example', createEvent()))
				.rejects.toThrow('ECONNRESET');
			expect(createPool).toHaveBeenCalledTimes(3);
			expect(wait.mock.calls.map(call => call[0])).toEqual([1000, 2000]);
			publisher.close('wss://relay.example');
			expect(closes.every(close => close.mock.calls.length === 1)).toBe(true);
		});

	}
);
