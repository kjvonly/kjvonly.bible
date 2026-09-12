import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	EventSigner
} from 'rx-nostr';

import type {
	Event,
	EventParameters
} from 'nostr-typedef';

import {
	GzipResourceContentDecorator
} from '$lib/resource/content/gzip-resource-content-decorator';

import {
	HexResourceContentDecorator
} from '$lib/resource/content/hex-resource-content-decorator';

import {
	JsonResourceContentDecorator
} from '$lib/resource/content/json-resource-content-decorator';

import {
	ResourceContentDecoratorBuilder
} from '$lib/resource/content/resource-content-decorator-builder';

import {
	ResourceContentEncoder
} from '$lib/resource/content/resource-content-encoder';

import type {
	ResourceClient,
	ResourcePublishResult
} from '$lib/resource/nostr/resource-client';

import {
	NostrResourcePublisher
} from './nostr-resource-publisher';

const PUBKEY =
	'a'.repeat(64);

const EVENT_ID =
	'b'.repeat(64);

describe(
	'NostrResourcePublisher',
	() => {
		it(
			'constructs, signs, and publishes a Resource content event',
			async () => {
				const signEvent =
					vi.fn(
						async (
							params:
								EventParameters
						) =>
							createSignedEvent(
								params
							)
					);

				const publishEvent =
					vi.fn()
						.mockResolvedValue(
							createAcceptedResult()
						);

				const publisher =
					new NostrResourcePublisher(
						createSigner({
							signEvent
						}),
						createClient(
							publishEvent
						),
						createContentEncoder()
					);

				await publisher.publish({
					publisher:
						PUBKEY,

					resourceType:
						'kjvonly/overlays/text-markup',

					resourceId:
						'kjvonly/overlays/text-markup/kjvs/1_1',

					representation:
						'content',

					mediaType:
						'application/json+gzip+hex',

					value: {
						'1': {
							'0': {
								class: [
									'bg-highlighta'
								]
							}
						}
					}
				});

				expect(
					signEvent
				).toHaveBeenCalledWith({
					kind:
						37770,

					tags: [
						[
							'd',
							'kjvonly/overlays/text-markup/kjvs/1_1'
						],
						[
							'm',
							'application/json+gzip+hex'
						],
						[
							't',
							'kjvonly/overlays/text-markup'
						],
						[
							'representation',
							'content'
						]
					],

					content:
						expect.any(
							String
						)
				});

				const eventParameters =
					signEvent.mock.calls[0]?.[0] as
						EventParameters;

				expect(
					eventParameters.content
				).toMatch(
					/^[0-9a-f]+$/
				);

				const decoded =
					await createDecoratorBuilder()
						.build(
							'application/json+gzip+hex'
						)
						.decode(
							eventParameters.content
						);

				expect(
					decoded
				).toEqual({
					'1': {
						'0': {
							class: [
								'bg-highlighta'
							]
						}
					}
				});

				expect(
					publishEvent
				).toHaveBeenCalledWith(
					expect.objectContaining({
						id:
							EVENT_ID,
						pubkey:
							PUBKEY
					})
				);
			}
		);

		it(
			'rejects publication when the Resource publisher is not the configured signer',
			async () => {
				const publishEvent =
					vi.fn();

				const publisher =
					new NostrResourcePublisher(
						createSigner(),
						createClient(
							publishEvent
						),
						createContentEncoder()
					);

				await expect(
					publisher.publish({
						publisher:
							'other-publisher',
						resourceType:
							'kjvonly/overlays/text-markup',
						resourceId:
							'kjvonly/overlays/text-markup/kjvs/1_1',
						representation:
							'content',
						mediaType:
							'application/json+gzip+hex',
						value:
							{}
					})
				).rejects.toThrow(
					'Resource publisher does not match configured signer'
				);

				expect(
					publishEvent
				).not.toHaveBeenCalled();
			}
		);

		it(
			'treats relay rejection as publication failure',
			async () => {
				const publisher =
					new NostrResourcePublisher(
						createSigner(),
						createClient(
							vi.fn()
								.mockResolvedValue({
									eventId:
										EVENT_ID,
									acknowledgements:
										[],
									acceptedByAnyRelay:
										false
								})
						),
						createContentEncoder()
					);

				await expect(
					publisher.publish({
						publisher:
							PUBKEY,
						resourceType:
							'kjvonly/overlays/text-markup',
						resourceId:
							'kjvonly/overlays/text-markup/kjvs/1_1',
						representation:
							'content',
						mediaType:
							'application/json+gzip+hex',
						value:
							{}
					})
				).rejects.toThrow(
					'Resource publication was rejected by all configured relays'
				);
			}
		);
	}
);

function createContentEncoder():
	ResourceContentEncoder {
	return new ResourceContentEncoder(
		createDecoratorBuilder()
	);
}

function createDecoratorBuilder():
	ResourceContentDecoratorBuilder {
	return new ResourceContentDecoratorBuilder([
		{
			token:
				'application/json',

			decorate:
				(inner) =>
					new JsonResourceContentDecorator(
						inner
					)
		},
		{
			token:
				'gzip',

			decorate:
				(inner) =>
					new GzipResourceContentDecorator(
						inner
					)
		},
		{
			token:
				'hex',

			decorate:
				(inner) =>
					new HexResourceContentDecorator(
						inner
					)
		}
	]);
}

function createSigner({
	signEvent =
		vi.fn(
			async (
				params:
					EventParameters
			) =>
				createSignedEvent(
					params
				)
		)
}: {
	readonly signEvent?:
		ReturnType<typeof vi.fn>;
} = {}): Pick<
	EventSigner,
	'getPublicKey' |
	'signEvent'
> {
	return {
		getPublicKey:
			vi.fn()
				.mockResolvedValue(
					PUBKEY
				),

		signEvent:
		signEvent as EventSigner['signEvent']
	};
}

function createClient(
	publishEvent:
		ReturnType<typeof vi.fn>
): Pick<
	ResourceClient,
	'publishEvent'
> {
	return {
		publishEvent
	};
}

function createSignedEvent(
	params:
		EventParameters
): Event {
	return {
		...params,
		id:
			EVENT_ID,
		pubkey:
			PUBKEY,
		created_at:
			1,
		sig:
			'c'.repeat(128)
	} as Event;
}

function createAcceptedResult():
	ResourcePublishResult {
	return {
		eventId:
			EVENT_ID,
		acknowledgements: [
			{
				relay:
					'wss://relay.test/',
				accepted:
					true
			}
		],
		acceptedByAnyRelay:
			true
	};
}
