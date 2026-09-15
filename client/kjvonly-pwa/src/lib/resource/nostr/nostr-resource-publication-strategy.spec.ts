import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
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
	NostrClient,
	NostrPublishResult
} from '$lib/infrastructure/nostr/client/nostr-client';

import {
	NostrResourcePublicationStrategy
} from './nostr-resource-publication-strategy';

const PUBKEY =
	'a'.repeat(64);

const EVENT_ID =
	'b'.repeat(64);

describe(
	'NostrResourcePublicationStrategy',
	() => {
		it(
			'constructs and publishes Resource content event parameters',
			async () => {
				const publishEvent =
					vi.fn()
						.mockResolvedValue(
							createAcceptedResult()
						);

				const publisher =
					new NostrResourcePublicationStrategy(
						createClient({
							publishEvent
						}),
						createContentEncoder()
					);

				await publisher.publish({
					type:
						'resource',

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
					publishEvent
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
					publishEvent.mock.calls[0]?.[0] as
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
			}
		);

		it(
			'publishes an addressable Resource deletion as NIP-09 event parameters',
			async () => {
				const publishEvent =
					vi.fn()
						.mockResolvedValue(
							createAcceptedResult()
						);

				const encode =
					vi.fn();

				const publisher =
					new NostrResourcePublicationStrategy(
						createClient({
							publishEvent
						}),
						{ encode }
					);

				await publisher.publish({
					type:
						'resource',

					operation:
						'delete',
					publisher:
						PUBKEY,
					resourceType:
						'kjvonly/notes/entries',
					resourceId:
						'kjvonly/notes/entries/default/note-1'
				});

				expect(
					encode
				).not.toHaveBeenCalled();

				expect(
					publishEvent
				).toHaveBeenCalledWith({
					kind:
						5,

					tags: [
						[
							'a',
							`37770:${PUBKEY}:kjvonly/notes/entries/default/note-1`
						],
						[
							'k',
							'37770'
						]
					],

					content:
						''
				});
			}
		);

		it(
			'rejects publication when the Resource publisher is not the configured signer',
			async () => {
				const publishEvent =
					vi.fn();

				const publisher =
					new NostrResourcePublicationStrategy(
						createClient({
							getPublicKey:
								vi.fn()
									.mockResolvedValue(
										PUBKEY
									),
							publishEvent
						}),
						createContentEncoder()
					);

				await expect(
					publisher.publish({
						type:
							'resource',

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
					new NostrResourcePublicationStrategy(
						createClient({
							publishEvent:
								vi.fn()
									.mockResolvedValue({
										eventId:
											EVENT_ID,
										acknowledgements:
											[],
										acceptedByAnyRelay:
											false
									})
						}),
						createContentEncoder()
					);

				await expect(
					publisher.publish({
						type:
							'resource',

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

function createClient({
	getPublicKey =
		vi.fn()
			.mockResolvedValue(
				PUBKEY
			),
	publishEvent
}: {
	readonly getPublicKey?:
		ReturnType<typeof vi.fn>;
	readonly publishEvent:
		ReturnType<typeof vi.fn>;
}): Pick<
	NostrClient,
	'getPublicKey' |
		'publishEvent'
> {
	return {
		getPublicKey,
		publishEvent
	};
}

function createAcceptedResult():
	NostrPublishResult {
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
