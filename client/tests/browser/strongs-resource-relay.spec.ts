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
	STRONGS_DEFINITION_OBJECT_TYPE
} from '$lib/domains/strongs/persistence/strongs-store';

import {
	createStrongsId
} from '$lib/domains/strongs/utils/strongs-identity';

import {
	createBibleVersionId
} from '$lib/domains/bible/utils/bible-identity';

import {
	createResourceInstallationId
} from '$lib/resource/installation/resource-installation';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

const RELAY_URL =
	import.meta.env
		.VITE_NOSTR_TEST_RELAY_URL ??
	'ws://127.0.0.1:3334';

describe(
	"Strong's Resource relay integration",
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
			"publishes discovers resolves decodes validates and installs a Strong's definition through the generic ResourceService",
			async () => {
				const resourceType =
					'kjvonly/strongs/definitions';

				const resourceId =
					`${resourceType}/kjvs/G1`;

				const content =
					createStrongsContent(
						'G1'
					);

				/*
				 * Publish the actual Resource
				 * to the local Nostr relay.
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
				 * Nothing below this point
				 * is faked.
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
					result.found
				).toBe(
					true
				);

				expect(
					result.requested
				).toEqual({
					publisher,
					resourceId
				});

				expect(
					result.resources
				).toEqual([
					{
						reference: {
							publisher,
							resourceId
						},

						resourceType,

						status:
							'handled'
					}
				]);

				const db =
					await getApplicationDB();

				const bibleVersionId =
					createBibleVersionId(
						publisher,
						'kjvs'
					);

				const strongsId =
					createStrongsId(
						bibleVersionId,
						'G1'
					);

				const storedDomainObjectId =
					createStoredDomainObjectId(
						STRONGS_DEFINITION_OBJECT_TYPE,
						strongsId
					);

				const installationId =
					createResourceInstallationId(
						STRONGS_DEFINITION_OBJECT_TYPE,
						strongsId
					);

				/*
				 * Strong's Domain Object
				 */
				expect(
					await db.get(
						DOMAIN_OBJECTS,
						storedDomainObjectId
					)
				).toEqual({
					id:
						storedDomainObjectId,

					objectType:
						STRONGS_DEFINITION_OBJECT_TYPE,

					objectId:
						strongsId,

					value: {
						id:
							strongsId,

						...content
					}
				});

				/*
				 * Resource provenance
				 */
				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						installationId
					)
				).toEqual({
					id:
						installationId,

					objectType:
						STRONGS_DEFINITION_OBJECT_TYPE,

					objectId:
						strongsId,

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

function createStrongsContent(
	number: string
) {
	return {
		number,

		originalWord:
			'Α',

		partsOfSpeech:
			'noun',

		phoneticSpelling:
			'alpha',

		transliteratedWord:
			'A',

		usageByBook:
			[],

		usageByWord:
			[],

		brownDef:
			null,

		strongsDef:
			'definition',

		thayersDef:
			null
	};
}