import {
	generateSecretKey,
	nip19
} from 'nostr-tools';

import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it
} from 'vitest';

import {
	NostrSigner
} from '$lib/infrastructure/nostr/nostr-signer';

import {
	createBrowserNostrClient
} from '$lib/infrastructure/nostr/client/create-nostr-client';

import {
	Application
} from '$lib/application/runtime/application';

import {
	RESOURCE_KIND,
	createResourceInstallationId
} from '$lib/resource';

import {
	BIBLE_CHAPTER_OBJECT_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-installer';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	createBibleVersionId,
	createChapterId
} from '$lib/domains/bible';


const RELAY_URL =
	import.meta.env
		.VITE_NOSTR_TEST_RELAY_URL ??
	'ws://127.0.0.1:3334';

const BIBLE_VERSION_OBJECT_TYPE =
	'bible/version';

describe(
	'Bible Chapter Resource relay integration',
	() => {
		let application:
			Application;

		let fixtureSigner:
			NostrSigner;

		let fixtureNostrClient:
			ReturnType<
				typeof createBrowserNostrClient
			>;

		let publisher:
			string;

		beforeEach(
			async () => {
				const secretKey =
					generateSecretKey();

				const nsec =
					nip19.nsecEncode(
						secretKey
					);

				fixtureSigner =
					new NostrSigner();

				await fixtureSigner
					.useSecretKey(
						secretKey
					);

				fixtureNostrClient =
					createBrowserNostrClient(
						fixtureSigner
					);

				fixtureNostrClient
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

				application =
					new Application({
						resourceRelays: [
							{
								url:
									RELAY_URL,

								read:
									true,

								write:
									true
							}
						]
					});

				await application
					.context
					.authenticationService
					.login(
						nsec
					);

				publisher =
					application
						.context
						.authenticationService
						.getUserId();

				await application.start();
			}
		);

		afterEach(
			async () => {
				await application.stop();

				fixtureNostrClient
					.dispose();

				await fixtureSigner
					.clear();
			}
		);

		it(
			'publishes discovers resolves decodes validates and installs a Bible Chapter',
			async () => {
				const resourceType =
					'kjvonly/bible/chapters';

				const resourceSourceId =
					`${resourceType}/kjvs`;

				const resourceId =
					`${resourceSourceId}/1_1`;

				const content =
					createChapterContent();

				/*
				 * Publish the actual Resource to
				 * the local Nostr relay.
				 */
				const publication =
					await fixtureNostrClient
						.publishEvent({
							kind:
								RESOURCE_KIND,

							tags: [
								[
									'd',
									resourceId
								],
								[
									't',
									resourceType
								],
								[
									'representation',
									'content'
								],
								[
									'm',
									'application/json'
								]
							],

							content:
								JSON.stringify(
									content
								)
						});

				expect(
					publication
						.acceptedByAnyRelay
				).toBe(
					true
				);

				const chapterId =
					createChapterId(
						createBibleVersionId(
							publisher,
							'kjvs'
						),
						'1_1'
					);

				const bibleVersionId =
					createBibleVersionId(
						publisher,
						'kjvs'
					);

				/*
				 * Enter through the Bible Domain service,
				 * exactly as application code does on a miss.
				 *
				 * Nothing below this point is faked.
				 */
				const chapter =
					await application
						.context
						.chapterService
						.get(
							{
								publisher,
								resourceId:
									resourceSourceId
							},
							'1_1'
						);

				expect(
					chapter
				).toEqual({
					id:
						chapterId,

					...content
				});

				const installationId =
					createResourceInstallationId(
						BIBLE_CHAPTER_OBJECT_TYPE,
						chapterId
					);

				/*
				 * Domain Object
				 */
				expect(
					await getDomainObject(
						BIBLE_CHAPTER_OBJECT_TYPE,
						chapterId
					)
				).toEqual({
					id:
						chapterId,

					...content
				});

				/*
				 * Installed Bible Version
				 */
				expect(
					await getDomainObject(
						BIBLE_VERSION_OBJECT_TYPE,
						bibleVersionId
					)
				).toEqual({
					id:
						bibleVersionId,

					publisher,

					version:
						'kjvs'
				});

				/*
				 * Resource provenance
				 */
				const db =
					await getApplicationDB();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						installationId
					)
				).toEqual({
					id:
						installationId,

					objectType:
						BIBLE_CHAPTER_OBJECT_TYPE,

					objectId:
						chapterId,

					publisher,

					resourceId,

					modifiedAt:
						expect.any(
							Number
						)
				});
			}
		);
	}
);

async function getDomainObject(
	objectType: string,
	objectId: string
): Promise<
	unknown |
	undefined
> {
	const db =
		await getApplicationDB();

	const stored =
		await db.get(
			DOMAIN_OBJECTS,
			createStoredDomainObjectId(
				objectType,
				objectId
			)
		);

	return stored?.value;
}

function createChapterContent() {
	return {
		number:
			1,

		bookName:
			'Genesis',

		verses: {
			'1': {
				number:
					1,

				words: [
					{
						text:
							'In',

						class:
							null,

						href:
							null,

						emphasis:
							false
					},
					{
						text:
							'the',

						class:
							null,

						href:
							null,

						emphasis:
							false
					},
					{
						text:
							'beginning',

						class:
							null,

						href:
							null,

						emphasis:
							false
					}
				],

				text:
					'In the beginning'
			}
		},

		verseMap: {
			'1':
				'1'
		},

		footnotes: {}
	};
}