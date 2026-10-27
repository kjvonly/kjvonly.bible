import {
	generateSecretKey,
	nip19
} from 'nostr-tools';

import type {
	Event,
	Filter
} from 'nostr-typedef';

import type {
	NostrClient
} from '$lib/infrastructure/nostr/client/nostr-client';

import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	Application
} from '$lib/application/runtime/application';

import {
	NostrResourcePublicationStrategy
} from '$lib/resource/nostr/nostr-resource-publication-strategy';

import {
	ResourceWorkerClient
} from '$lib/resource/worker';

import {
	KJVONLY_PUBKEY
} from '$lib/infrastructure/nostr/nostr';

import {
	createBrowserNostrClient
} from '$lib/infrastructure/nostr/client/create-nostr-client';

import {
	NostrSigner
} from '$lib/infrastructure/nostr/nostr-signer';

import {
	NOSTR_LOGIN_STORAGE_KEY
} from '$lib/infrastructure/nostr/authentication/nostr-authentication-strategy';

import {
	DOMAIN_OBJECTS,
	OUTBOX,
	RESOURCE_INSTALLATIONS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION,
	NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
	NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_TYPE,
	NORMALIZED_DOCUMENT_DATA_TYPE,
	NORMALIZED_DOCUMENT_DATA_VERSION,
	NORMALIZED_CONTENT_RESOURCE_TYPE,
	createNormalizedContentTextMarkupResourceId
} from '$lib/domains/normalized-content';

import {
	RESOURCE_KIND,
	createResourceInstallationId,
	type ResourceDescriptor
} from '$lib/resource';

// An intentionally unreachable relay address: all Nostr I/O is replaced
// by the in-memory client below. No WebSocket connection is opened.
const RELAY_URL =
	'wss://nostr.test.invalid';

const inMemoryRelay = vi.hoisted(() => ({
	events: [] as Event[]
}));

/**
 * Preserve real event signing and the application's Resource/Outbox paths,
 * but replace external Nostr communication with a deterministic event store.
 */
vi.mock(
	'$lib/infrastructure/nostr/client/create-nostr-client',
	() => ({
		createBrowserNostrClient: (signer: NostrSigner): NostrClient => {
			const find = (filter: Filter): Event[] =>
				inMemoryRelay.events.filter((event) => {
					if (
						filter.kinds !== undefined &&
						!filter.kinds.includes(event.kind)
					) {
						return false;
					}

					if (
						filter.authors !== undefined &&
						!filter.authors.includes(event.pubkey)
					) {
						return false;
					}

					if (
						filter.ids !== undefined &&
						!filter.ids.includes(event.id)
					) {
						return false;
					}

					return Object.entries(filter).every(([key, values]) => {
						if (!key.startsWith('#')) {
							return true;
						}

						return Array.isArray(values) &&
							values.some((value: unknown) =>
								typeof value === 'string' &&
								event.tags.some((tag) =>
									tag[0] === key.slice(1) &&
									tag.slice(1).includes(value)
								)
							);
					});
				});

			return {
				setDefaultRelays: () => {},
				getPublicKey: () => signer.getPublicKey(),
				getEvent: async (filter) => find(filter)[0] ?? null,
				getEvents: async (filters) => {
					const requested = Array.isArray(filters)
						? filters
						: [filters];
					return [...new Map(
						requested.flatMap(find).map((event) => [event.id, event])
					).values()];
				},
				publishEvent: async (parameters) => {
					const event = await signer.signEvent(parameters);
					inMemoryRelay.events.unshift(event);
					return {
						eventId: event.id,
						acknowledgements: [{
							relay: RELAY_URL,
							accepted: true
						}],
						acceptedByAnyRelay: true
					};
				},
				subscribe: () => ({ close: () => {} }),
				dispose: () => {}
			};
		}
	})
);

describe(
	'Normalized Content Text Markup Resource round-trip (in-memory Nostr)',
	() => {
		let application:
			Application;

		let signer:
			NostrSigner;

		let relayClient:
			ReturnType<typeof createBrowserNostrClient>;

		let publisher:
			string;

		let previousLogin: string | null = null;

		let publishAttempts = 0;
		let publishFailures: unknown[] = [];

		beforeEach(
			async () => {
				previousLogin = localStorage.getItem(NOSTR_LOGIN_STORAGE_KEY);
				inMemoryRelay.events.length = 0;

				// This test owns the Outbox queue: old pending publications
				// from other browser fixtures must not delay its own event.
				const db = await getApplicationDB();
				await db.clear(OUTBOX);

				publishAttempts = 0;
				publishFailures = [];

				const secretKey =
					generateSecretKey();

				signer =
					new NostrSigner();

				await signer.useSecretKey(
					secretKey
				);

				relayClient =
					createBrowserNostrClient(
						signer
					);

				relayClient.setDefaultRelays([
					{
						url: RELAY_URL,
						read: true,
						write: true
					}
				]);

				const relays = [
					{
						url: RELAY_URL,
						read: true,
						write: true
					}
				];

				// Bootstrap is unrelated to Text Markup. Stub only that
				// Resource while retaining real Worker installation for the
				// user-owned Text Markup Resource under test.
				const install = ResourceWorkerClient.prototype.install;
				vi.spyOn(ResourceWorkerClient.prototype, 'install')
					.mockImplementation(function (reference) {
						if (
							reference.publisher === KJVONLY_PUBKEY &&
							reference.resourceId ===
								'kjvonly/resources/collections/default'
						) {
							return Promise.resolve({
								requested: reference,
								found: true,
								resources: []
							});
						}

						return install.call(this, reference);
					});

				// Retain the real Resource publication strategy, but surface errors which
				// the durable Outbox deliberately swallows for retry.
				const publish =
					NostrResourcePublicationStrategy.prototype.publish;
				vi.spyOn(NostrResourcePublicationStrategy.prototype, 'publish')
					.mockImplementation(async function (publication) {
						publishAttempts++;
						try {
							await publish.call(this, publication);
						} catch (error) {
							publishFailures.push(error);
							throw error;
						}
					});

				application =
					new Application({
						resourceRelays: relays,
						accountBootstrapRelays: relays
					});

				await application.context
					.authenticationService.login(
						nip19.nsecEncode(secretKey)
					);

				publisher =
					application.context
						.authenticationService
						.getUserId();

				await application.start();
			}
		);

		afterEach(
			async () => {
				await application?.stop();
				relayClient?.dispose();
				await signer?.clear();
				if (previousLogin === null) {
					localStorage.removeItem(NOSTR_LOGIN_STORAGE_KEY);
				} else {
					localStorage.setItem(NOSTR_LOGIN_STORAGE_KEY, previousLogin);
				}
				vi.restoreAllMocks();
			}
		);

		it(
			'saves through Outbox, publishes to Nostr, and reinstalls the exact snapshot on a local miss',
			async () => {
				const descriptor:
					ResourceDescriptor = {
					metadata: {
						publisher:
							'f'.repeat(64),
						resourceId:
							`integration/normalized-document/${crypto.randomUUID()}`,
						resourceType:
							NORMALIZED_CONTENT_RESOURCE_TYPE,
						dataType:
							NORMALIZED_DOCUMENT_DATA_TYPE,
						dataVersion:
							NORMALIZED_DOCUMENT_DATA_VERSION,
						modifiedAt:
							42,
						representation:
							'content',
						mediaType:
							'application/json'
					},
					strategy: {
						type:
							'nostr',
						data:
							{}
					}
				};

				const service =
					application.context
						.normalizedContentTextMarkupService;

				const empty =
					service.create(
						publisher,
						descriptor
					);

				const markup = {
					...empty,
					markings: {
						'paragraph-1': {
							'0': {
								class: [
									'bg-highlighta'
								]
							},
							'2': {
								class: [
									'decoration-highlightb'
								]
							}
						}
					}
				};

				const resourceId =
					createNormalizedContentTextMarkupResourceId(
						empty.document.publisher,
						empty.document.resourceId,
						empty.document.modifiedAt
					);

				const storedId =
					createStoredDomainObjectId(
						NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
						markup.id
					);

				const installationId =
					createResourceInstallationId(
						NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
						markup.id
					);

				await service.put(markup);

				const db =
					await getApplicationDB();

				expect(
					(await db.get(DOMAIN_OBJECTS, storedId))?.value
				).toEqual(markup);

				// First prove that the application's Outbox processed this
				// publication. Otherwise a relay lookup timeout hides whether
				// the failure was in publication or discovery.
				await vi.waitFor(
					async () => {
						const failure = publishFailures.at(-1);
						const cause = failure instanceof Error
							? failure.stack ?? failure.message
							: String(failure ?? 'no error captured');
						expect(
							await db.get(OUTBOX, storedId),
							`Text Markup Outbox pending (publish calls: ${publishAttempts}; last error: ${cause})`
						).toBeUndefined();
					},
					{
						timeout: 15000,
						interval: 200
					}
				);

				// The application Outbox must publish a signed Resource event
				// through the in-memory Nostr boundary.
				const event =
					await vi.waitFor(
						async () => {
							const found =
								await relayClient.getEvent({
									kinds: [RESOURCE_KIND],
									authors: [publisher],
									'#d': [resourceId]
								});

							expect(found).not.toBeNull();
							return found!;
						},
						{
							timeout: 15000,
							interval: 200
						}
					);

				expect(event.tags).toEqual(
					expect.arrayContaining([
						['d', resourceId],
						['t', NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_TYPE],
						['m', 'application/json+gzip+hex'],
						['dataType', NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE],
						['dataVersion', String(NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION)],
						['representation', 'content']
					])
				);

				expect(event.pubkey).toBe(publisher);
				expect(event.sig).toMatch(/^[0-9a-f]{128}$/);
				expect(event.content).toMatch(/^[0-9a-f]+$/);

				// Emulate a new installation without disturbing authentication.
				await db.delete(DOMAIN_OBJECTS, storedId);
				await db.delete(RESOURCE_INSTALLATIONS, installationId);

				expect(await db.get(DOMAIN_OBJECTS, storedId))
					.toBeUndefined();
				expect(await db.get(RESOURCE_INSTALLATIONS, installationId))
					.toBeUndefined();

				expect(
					await service.get(publisher, descriptor)
				).toEqual(markup);

				expect(
					(await db.get(DOMAIN_OBJECTS, storedId))?.value
				).toEqual(markup);

				expect(
					await db.get(RESOURCE_INSTALLATIONS, installationId)
				).toEqual({
					id:
						installationId,
					objectType:
						NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
					objectId:
						markup.id,
					publisher,
					resourceId,
					modifiedAt:
						event.created_at
				});
			},
			45000
		);
	}
);
