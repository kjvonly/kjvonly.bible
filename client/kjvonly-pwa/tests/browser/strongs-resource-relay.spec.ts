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
	STRONGS_DEFINITION_OBJECT_TYPE
} from '$lib/domains/strongs/persistence/strongs-store';

import {
	createStrongsId
} from '$lib/domains/strongs/utils/strongs-identity';

import {
	createBibleVersionId
} from '$lib/domains/bible';


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
			"publishes discovers resolves decodes validates and installs a Strong's definition through the generic ResourceService",
			async () => {
				const resourceType =
					'kjvonly/strongs/definitions';

				const resourceSourceId =
					`${resourceType}/kjvs`;

				const resourceId =
					`${resourceSourceId}/G1`;

				const content =
					createStrongsContent(
						'G1'
					);

				/*
				 * Publish the actual Resource
				 * to the local Nostr relay.
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

				/*
				 * Enter through the Strong's Domain service,
				 * exactly as application code does on a miss.
				 *
				 * Nothing below this point is faked.
				 */
				const strongs =
					await application
						.context
						.strongsService
						.get(
							{
								publisher,
								resourceId:
									resourceSourceId
							},
							'G1'
						);

				expect(
					strongs
				).toEqual({
					id:
						strongsId,

					...content
				});

				const db =
					await getApplicationDB();

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