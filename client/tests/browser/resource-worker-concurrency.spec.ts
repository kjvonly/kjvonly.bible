import {
	generateSecretKey
} from 'nostr-tools';

import {
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	PublishedResourceReference,
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import type {
	ResourceInstallResult
} from '$lib/resource/services/resource-install-result';

import {
	NostrSigner
} from '$lib/infrastructure/nostr/nostr-signer';

import {
	createBrowserResourceClient
} from '$lib/infrastructure/nostr/resource-client';

import {
	ResourceDiscovery
} from '$lib/resource/nostr/resource-discovery';

import {
	createBrowserResourceWorkerClient
} from '$lib/resource/worker/resource-worker-client';

import {
	KJVONLY_PUBKEY
} from '$lib/infrastructure/nostr/nostr';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';

import {
	BIBLE_CHAPTER_OBJECT_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-installer';

import {
	createBibleVersionId,
	createChapterId
} from '$lib/domains/bible/utils/bible-identity';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	RESOURCE_RECEIPTS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

///////////////////////////////////////////////////////////////////////////////

const RELAY_URL =
	import.meta.env
		.VITE_NOSTR_TEST_RELAY_URL ??
	'ws://127.0.0.1:3334';

const BOOTSTRAP_RESOURCE_ID =
	'kjvonly/resources/collections/default';

const DESCRIPTOR_REQUEST_COUNT =
	4;

const DESCRIPTOR_REPETITIONS =
	256;

///////////////////////////////////////////////////////////////////////////////

describe(
	'Resource Worker concurrency integration',
	() => {

		beforeEach(
			async () => {
				const db =
					await getApplicationDB();

				await db.clear(
					DOMAIN_OBJECTS
				);

				await db.clear(
					RESOURCE_INSTALLATIONS
				);

				await db.clear(
					RESOURCE_RECEIPTS
				);
			}
		);

		it(
			'installs content while all descriptor workers are occupied and another descriptor install is queued',
			async () => {

				const nostrSigner =
					new NostrSigner();

				await nostrSigner
					.useSecretKey(
						generateSecretKey()
					);

				const resourceClient =
					createBrowserResourceClient(
						nostrSigner
					);

				resourceClient
					.setDefaultRelays([
						{
							url:
								RELAY_URL,

							read:
								true,

							write:
								true
						}
					]);

				let resourceWorkerClient:
					ReturnType<
						typeof createBrowserResourceWorkerClient
					> |
					undefined;

				let descriptorInstalls:
					TrackedInstall[] =
					[];

				try {
					const fixtureDiscovery =
						new ResourceDiscovery(
							resourceClient
						);

					const fixtureRepresentation =
						await fixtureDiscovery.get({
							publisher:
								KJVONLY_PUBKEY,

							resourceId:
								BOOTSTRAP_RESOURCE_ID
						});

					if (
						fixtureRepresentation ===
							null ||
						fixtureRepresentation
							.representation !==
							'descriptors'
					) {
						throw new Error(
							'Expected bootstrap descriptors Resource fixture.'
						);
					}

					if (
						fixtureRepresentation
							.mediaType !==
							'application/json'
					) {
						throw new Error(
							'Expected JSON bootstrap descriptors fixture.'
						);
					}

					const descriptorTemplate =
						readFirstDescriptor(
							fixtureRepresentation
						);

					const rootPublisher =
						createPublisher();

					const descriptorReferences =
						Array.from(
							{
								length:
									DESCRIPTOR_REQUEST_COUNT
							},

							(
								_,
								index
							) => ({
								publisher:
									rootPublisher,

								resourceId:
									`kjvonly/resources/collections/concurrency-${index}`
							})
						);

					const contentPublisher =
						createPublisher();

					const version =
						`concurrency${createToken()}`;

					const contentReference:
						PublishedResourceReference = {
						publisher:
							contentPublisher,

						resourceId:
							`${BIBLE_CHAPTER_RESOURCE_TYPE}/${version}/1_1`
					};

					const representations =
						new Map<
							string,
							ResourceRepresentation
						>();

					for (
						let index =
							0;
						index <
							descriptorReferences.length;
						index +=
							1
					) {
						const reference =
							descriptorReferences[
								index
							];

						if (
							reference ===
							undefined
						) {
							throw new Error(
								'Expected descriptor reference.'
							);
						}

						representations.set(
							createReferenceKey(
								reference
							),
							createHeavyDescriptorRepresentation(
								reference,
								descriptorTemplate,
								index
							)
						);
					}

					representations.set(
						createReferenceKey(
							contentReference
						),
						createContentRepresentation(
							contentReference
						)
					);

					const discovery =
						new MappingDiscovery(
							representations
						);

					resourceWorkerClient =
						createBrowserResourceWorkerClient(
							discovery
						);

					descriptorInstalls =
						descriptorReferences.map(
							(reference) =>
								trackInstall(
									resourceWorkerClient!
										.install(
											reference
										)
								)
						);

					await vi.waitFor(
						() => {
							expect(
								discovery
									.references
							).toHaveLength(
								DESCRIPTOR_REQUEST_COUNT
							);
						}
					);

					await nextTask();
					await nextTask();

					expect(
						descriptorInstalls
							.every(
								(install) =>
									!install.settled
							)
					).toBe(
						true
					);

					const contentResult =
						await resourceWorkerClient
							.install(
								contentReference
							);

					expect(
						contentResult
					).toEqual({
						requested:
							contentReference,

						found:
							true,

						resources: [
							{
								reference:
									contentReference,

								resourceType:
									BIBLE_CHAPTER_RESOURCE_TYPE,

								status:
									'handled'
							}
						]
					});

					expect(
						descriptorInstalls
							.every(
								(install) =>
									!install.settled
							)
					).toBe(
						true
					);

					const chapterId =
						createChapterId(
							createBibleVersionId(
								contentPublisher,
								version
							),
							'1_1'
						);

					const db =
						await getApplicationDB();

					expect(
						await db.get(
							DOMAIN_OBJECTS,
							createStoredDomainObjectId(
								BIBLE_CHAPTER_OBJECT_TYPE,
								chapterId
							)
						)
					).toMatchObject({
						objectType:
							BIBLE_CHAPTER_OBJECT_TYPE,

						objectId:
							chapterId,

						value: {
							id:
								chapterId,

							number:
								1,

							bookName:
								'Genesis'
						}
					});
				} finally {
					resourceWorkerClient
						?.dispose();

					await Promise.allSettled(
						descriptorInstalls.map(
							(install) =>
								install.promise
						)
					);

					resourceClient
						.dispose();

					await nostrSigner
						.clear();
				}
			}
		);
	}
);

///////////////////////////////////////////////////////////////////////////////
// Discovery

class MappingDiscovery {

	readonly references:
		PublishedResourceReference[] =
			[];

	constructor(
		private readonly representations:
			ReadonlyMap<
				string,
				ResourceRepresentation
			>
	) {}

	async get(
		reference:
			PublishedResourceReference
	): Promise<
		ResourceRepresentation |
		null
	> {

		this.references.push(
			reference
		);

		return (
			this.representations.get(
				createReferenceKey(
					reference
				)
			) ??
			null
		);
	}
}

function createReferenceKey(
	reference:
		PublishedResourceReference
): string {

	return JSON.stringify([
		reference.publisher,
		reference.resourceId
	]);
}

///////////////////////////////////////////////////////////////////////////////
// Descriptor fixture

function readFirstDescriptor(
	representation:
		ResourceRepresentation
): unknown {

	const value:
		unknown =
			JSON.parse(
				representation.payload
			);

	if (
		!Array.isArray(
			value
		) ||
		value.length ===
			0
	) {
		throw new Error(
			'Expected bootstrap descriptor fixture entries.'
		);
	}

	return value[0];
}

function createHeavyDescriptorRepresentation(
	reference:
		PublishedResourceReference,

	descriptorTemplate:
		unknown,

	index:
		number
): ResourceRepresentation {

	const descriptors =
		Array.from(
			{
				length:
					DESCRIPTOR_REPETITIONS
			},

			() =>
				descriptorTemplate
		);

	return {
		publisher:
			reference.publisher,

		resourceId:
			reference.resourceId,

		resourceType:
			'kjvonly/resources/collections',

		eventId:
			createEventId(
				index
			),

		modifiedAt:
			1000 +
			index,

		representation:
			'descriptors',

		mediaType:
			'application/json',

		payload:
			JSON.stringify(
				descriptors
			)
	};
}

///////////////////////////////////////////////////////////////////////////////
// Content fixture

function createContentRepresentation(
	reference:
		PublishedResourceReference
): ResourceRepresentation {

	return {
		publisher:
			reference.publisher,

		resourceId:
			reference.resourceId,

		resourceType:
			BIBLE_CHAPTER_RESOURCE_TYPE,

		eventId:
			'f'.repeat(
				64
			),

		modifiedAt:
			10_000,

		representation:
			'content',

		mediaType:
			'application/json',

		payload:
			JSON.stringify(
				createChapterContent()
			)
	};
}

function createChapterContent() {

	return {
		number:
			1,

		bookName:
			'Genesis',

		verses:
			{},

		verseMap:
			{},

		footnotes:
			{}
	};
}

///////////////////////////////////////////////////////////////////////////////
// Promise tracking

interface TrackedInstall {
	readonly promise:
		Promise<ResourceInstallResult>;

	settled:
		boolean;
}

function trackInstall(
	promise:
		Promise<ResourceInstallResult>
): TrackedInstall {

	const tracked:
		TrackedInstall = {
		promise,

		settled:
			false
	};

	void promise.then(
		() => {
			tracked.settled =
				true;
		},

		() => {
			tracked.settled =
				true;
		}
	);

	return tracked;
}

///////////////////////////////////////////////////////////////////////////////
// Helpers

function createPublisher():
	string {

	return (
		createToken() +
		createToken()
	);
}

function createToken():
	string {

	return crypto
		.randomUUID()
		.replaceAll(
			'-',
			''
		);
}

function createEventId(
	index:
		number
): string {

	const prefix =
		index.toString(
			16
		);

	return (
		prefix +
		'a'.repeat(
			64 -
			prefix.length
		)
	);
}

function nextTask():
	Promise<void> {

	return new Promise(
		(resolve) => {
			setTimeout(
				resolve,
				0
			);
		}
	);
}
