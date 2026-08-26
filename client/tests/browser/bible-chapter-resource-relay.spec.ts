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
	BIBLE_VERSIONS,
	CHAPTERS,
	RESOURCE_INSTALLATIONS,
	getBibleDB
} from '$lib/domains/bible/persistence/bible.db';

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
				 * Enter through the application-facing
				 * Bible Chapter Resource service.
				 *
				 * Nothing below this point is faked.
				 */
				const installed =
					await application
						.context
						.bibleChapterResourceService
						.install({
							publisher,
							resourceId
						});

				expect(
					installed
				).toBe(
					true
				);

				const db =
					await getBibleDB();

				const chapterId =
					createChapterId(
						publisher,
						'kjvs',
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
					await db.getValue(
						CHAPTERS,
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
					await db.getValue(
						BIBLE_VERSIONS,
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
				expect(
					await db.getValue(
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

					eventId:
						publication.eventId,

					modifiedAt:
						expect.any(
							Number
						)
				});
			}
		);
	}
);

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