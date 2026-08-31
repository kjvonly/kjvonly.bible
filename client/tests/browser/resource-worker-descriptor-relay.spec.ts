import {
	generateSecretKey
} from 'nostr-tools';

import {
	beforeEach,
	describe,
	expect,
	it
} from 'vitest';

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
	STRONGS_RESOURCE_TYPE
} from '$lib/domains/strongs/resources/definitions/strongs-interpreter';

import {
	STRONGS_DEFINITION_OBJECT_TYPE
} from '$lib/domains/strongs/persistence/strongs-store';

import {
	createBibleVersionId,
	createChapterId
} from '$lib/domains/bible/utils/bible-identity';

import {
	createStrongsId
} from '$lib/domains/strongs/utils/strongs-identity';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	RESOURCE_RECEIPTS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	createResourceInstallationId
} from '$lib/resource/installation/resource-installation';

import {
	createResourceReceiptId
} from '$lib/resource/receipts/resource-receipt';

///////////////////////////////////////////////////////////////////////////////

const RELAY_URL =
	import.meta.env
		.VITE_NOSTR_TEST_RELAY_URL ??
	'ws://127.0.0.1:3334';

const BOOTSTRAP_RESOURCE_ID =
	'kjvonly/resources/collections/default';

const CHAPTER_RESOURCE_ID =
	`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs`;

const STRONGS_RESOURCE_ID =
	`${STRONGS_RESOURCE_TYPE}/kjvs/H7225`;

///////////////////////////////////////////////////////////////////////////////

describe(
	'Resource Worker descriptor relay integration',
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
			'discovers a descriptor collection and installs Blossom-backed Resources through a real Worker',
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

				const resourceDiscovery =
					new ResourceDiscovery(
						resourceClient
					);

				const resourceWorkerClient =
					createBrowserResourceWorkerClient(
						resourceDiscovery
					);

				try {
					const reference = {
						publisher:
							KJVONLY_PUBKEY,

						resourceId:
							BOOTSTRAP_RESOURCE_ID
					};

					/*
					 * This enters through the actual
					 * worker-backed Resource pipeline.
					 *
					 * Main thread:
					 *
					 *     ResourceWorkerClient
					 *         ↓
					 *     ResourceDiscovery
					 *         ↓
					 *     ResourceClient / relay
					 *
					 * Worker:
					 *
					 *     ResourceService
					 *         ↓
					 *     DescriptorsRepresentationResolver
					 *         ↓
					 *     Blossom
					 *         ↓
					 *     SHA-256 verification
					 *         ↓
					 *     gzip / JSON decoding
					 *         ↓
					 *     Domain handlers
					 *         ↓
					 *     IndexedDB
					 */
					const result =
						await resourceWorkerClient
							.install(
								reference
							);

					expect(
						result
					).toEqual({
						requested:
							reference,

						found:
							true,

						resources: [
							{
								reference: {
									publisher:
										KJVONLY_PUBKEY,

									resourceId:
										CHAPTER_RESOURCE_ID
								},

								resourceType:
									BIBLE_CHAPTER_RESOURCE_TYPE,

								status:
									'handled'
							},
							{
								reference: {
									publisher:
										KJVONLY_PUBKEY,

									resourceId:
										STRONGS_RESOURCE_ID
								},

								resourceType:
									STRONGS_RESOURCE_TYPE,

								status:
									'handled'
							}
						]
					});

					const db =
						await getApplicationDB();

					const bibleVersionId =
						createBibleVersionId(
							KJVONLY_PUBKEY,
							'kjvs'
						);

					const chapter1Id =
						createChapterId(
							bibleVersionId,
							'1_1'
						);

					const chapter2Id =
						createChapterId(
							bibleVersionId,
							'1_2'
						);

					const strongsId =
						createStrongsId(
							bibleVersionId,
							'H7225'
						);

					///////////////////////////////////////////////////////////
					// Chapter 1 Domain Object

					const chapter1 =
						await db.get(
							DOMAIN_OBJECTS,
							createStoredDomainObjectId(
								BIBLE_CHAPTER_OBJECT_TYPE,
								chapter1Id
							)
						);

					expect(
						chapter1
					).toMatchObject({
						objectType:
							BIBLE_CHAPTER_OBJECT_TYPE,

						objectId:
							chapter1Id,

						value: {
							id:
								chapter1Id,

							number:
								1,

							bookName:
								'Genesis'
						}
					});

					///////////////////////////////////////////////////////////
					// Chapter 2 Domain Object

					const chapter2 =
						await db.get(
							DOMAIN_OBJECTS,
							createStoredDomainObjectId(
								BIBLE_CHAPTER_OBJECT_TYPE,
								chapter2Id
							)
						);

					expect(
						chapter2
					).toMatchObject({
						objectType:
							BIBLE_CHAPTER_OBJECT_TYPE,

						objectId:
							chapter2Id,

						value: {
							id:
								chapter2Id,

							number:
								2,

							bookName:
								'Genesis'
						}
					});

					///////////////////////////////////////////////////////////
					// Strong's Domain Object

					const strongs =
						await db.get(
							DOMAIN_OBJECTS,
							createStoredDomainObjectId(
								STRONGS_DEFINITION_OBJECT_TYPE,
								strongsId
							)
						);

					expect(
						strongs
					).toMatchObject({
						objectType:
							STRONGS_DEFINITION_OBJECT_TYPE,

						objectId:
							strongsId,

						value: {
							id:
								strongsId,

							number:
								'H7225'
						}
					});

					///////////////////////////////////////////////////////////
					// Chapter 1 provenance
					//
					// Both Chapters came from the same
					// bundled Published Resource.

					expect(
						await db.get(
							RESOURCE_INSTALLATIONS,
							createResourceInstallationId(
								BIBLE_CHAPTER_OBJECT_TYPE,
								chapter1Id
							)
						)
					).toMatchObject({
						objectType:
							BIBLE_CHAPTER_OBJECT_TYPE,

						objectId:
							chapter1Id,

						publisher:
							KJVONLY_PUBKEY,

						resourceId:
							CHAPTER_RESOURCE_ID,

						modifiedAt:
							expect.any(
								Number
							)
					});

					///////////////////////////////////////////////////////////
					// Chapter 2 provenance

					expect(
						await db.get(
							RESOURCE_INSTALLATIONS,
							createResourceInstallationId(
								BIBLE_CHAPTER_OBJECT_TYPE,
								chapter2Id
							)
						)
					).toMatchObject({
						objectType:
							BIBLE_CHAPTER_OBJECT_TYPE,

						objectId:
							chapter2Id,

						publisher:
							KJVONLY_PUBKEY,

						resourceId:
							CHAPTER_RESOURCE_ID,

						modifiedAt:
							expect.any(
								Number
							)
					});

					///////////////////////////////////////////////////////////
					// Strong's provenance

					expect(
						await db.get(
							RESOURCE_INSTALLATIONS,
							createResourceInstallationId(
								STRONGS_DEFINITION_OBJECT_TYPE,
								strongsId
							)
						)
					).toMatchObject({
						objectType:
							STRONGS_DEFINITION_OBJECT_TYPE,

						objectId:
							strongsId,

						publisher:
							KJVONLY_PUBKEY,

						resourceId:
							STRONGS_RESOURCE_ID,

						modifiedAt:
							expect.any(
								Number
							)
					});

					///////////////////////////////////////////////////////////
					// Chapter Resource receipt
					//
					// There is one receipt for the bundled
					// Chapter Published Resource, not one
					// receipt per Chapter Domain Object.

					const chapterReceipt =
						await db.get(
							RESOURCE_RECEIPTS,
							createResourceReceiptId(
								KJVONLY_PUBKEY,
								CHAPTER_RESOURCE_ID
							)
						);

					expect(
						chapterReceipt
					).toEqual({
						id:
							createResourceReceiptId(
								KJVONLY_PUBKEY,
								CHAPTER_RESOURCE_ID
							),

						publisher:
							KJVONLY_PUBKEY,

						resourceId:
							CHAPTER_RESOURCE_ID,

						modifiedAt:
							expect.any(
								Number
							)
					});

					///////////////////////////////////////////////////////////
					// Strong's Resource receipt

					const strongsReceipt =
						await db.get(
							RESOURCE_RECEIPTS,
							createResourceReceiptId(
								KJVONLY_PUBKEY,
								STRONGS_RESOURCE_ID
							)
						);

					expect(
						strongsReceipt
					).toEqual({
						id:
							createResourceReceiptId(
								KJVONLY_PUBKEY,
								STRONGS_RESOURCE_ID
							),

						publisher:
							KJVONLY_PUBKEY,

						resourceId:
							STRONGS_RESOURCE_ID,

						modifiedAt:
							expect.any(
								Number
							)
					});

					///////////////////////////////////////////////////////////
					// Receipt granularity
					//
					// Three installed Domain Objects:
					//
					//     Chapter 1
					//     Chapter 2
					//     Strong's H7225
					//
					// came from two Published Resources:
					//
					//     bundled Chapter Resource
					//     individual Strong's Resource
					//
					// therefore exactly two receipts exist.

					const receipts =
						await db.getAll(
							RESOURCE_RECEIPTS
						);

					expect(
						receipts
					).toHaveLength(
						2
					);

					expect(
						receipts
							.map(
								(receipt) =>
									receipt.id
							)
							.sort()
					).toEqual(
						[
							createResourceReceiptId(
								KJVONLY_PUBKEY,
								CHAPTER_RESOURCE_ID
							),

							createResourceReceiptId(
								KJVONLY_PUBKEY,
								STRONGS_RESOURCE_ID
							)
						].sort()
					);

					///////////////////////////////////////////////////////////
					// Second installation
					//
					// Descriptor children whose receipts are
					// already current are invisible no-ops.
					//
					// The root descriptors Resource is still
					// discovered, but neither child needs
					// processing again.

					const secondResult =
						await resourceWorkerClient
							.install(
								reference
							);

					expect(
						secondResult
					).toEqual({
						requested:
							reference,

						found:
							true,

						resources: [
							{
								reference: {
									publisher:
										KJVONLY_PUBKEY,

									resourceId:
										'kjvonly/bible/chapters/kjvs'
								},

								resourceType:
									'kjvonly/bible/chapters',

								status:
									'current'
							},
							{
								reference: {
									publisher:
										KJVONLY_PUBKEY,

									resourceId:
										'kjvonly/strongs/definitions/kjvs/H7225'
								},

								resourceType:
									'kjvonly/strongs/definitions',

								status:
									'current'
							}
						]
					});

					///////////////////////////////////////////////////////////
					// Receipts remain unchanged.

					expect(
						await db.get(
							RESOURCE_RECEIPTS,
							createResourceReceiptId(
								KJVONLY_PUBKEY,
								CHAPTER_RESOURCE_ID
							)
						)
					).toEqual(
						chapterReceipt
					);

					expect(
						await db.get(
							RESOURCE_RECEIPTS,
							createResourceReceiptId(
								KJVONLY_PUBKEY,
								STRONGS_RESOURCE_ID
							)
						)
					).toEqual(
						strongsReceipt
					);
				} finally {
					resourceWorkerClient
						.dispose();

					resourceClient
						.dispose();

					await nostrSigner
						.clear();
				}
			}
		);
	}
);