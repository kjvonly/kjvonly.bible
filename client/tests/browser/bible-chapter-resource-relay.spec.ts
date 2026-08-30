import {
	generateSecretKey
} from 'nostr-tools';

import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it
} from 'vitest';

import {
	Application
} from '$lib/application/runtime/application';

import {
	RESOURCE_KIND
} from '$lib/resource/models/resource.model';

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
} from '$lib/domains/bible/utils/bible-identity';

import {
	createResourceInstallationId
} from '$lib/resource/installation/resource-installation';

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

		let publisher:
			string;

		beforeEach(
			async () => {
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
					.nostrSigner
					.useSecretKey(
						generateSecretKey()
					);

				publisher =
					await application
						.context
						.nostrSigner
						.getPublicKey();

				await application.start();
			}
		);

		afterEach(
			async () => {
				await application.stop();
			}
		);

		it(
			'publishes discovers resolves decodes validates and installs a Bible Chapter',
			async () => {
				const resourceType =
					'kjvonly/bible/chapters';

				const resourceId =
					`${resourceType}/kjvs/1_1`;

				const content =
					createChapterContent();

				/*
				 * Publish the actual Resource to
				 * the local Nostr relay.
				 */
				const publication =
					await application
						.context
						.resourceClient
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

				/*
				 * Enter through the generic
				 * application ResourceService.
				 *
				 * Nothing below this point is faked.
				 */
				const result =
					await application
						.context
						.resourceService
						.install({
							publisher,
							resourceId
						});

				expect(
					result
				).toEqual({
					requested: {
						publisher,
						resourceId
					},

					found:
						true,

					resources: [
						{
							reference: {
								publisher,
								resourceId
							},

							resourceType,

							status:
								'handled'
						}
					]
				});

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