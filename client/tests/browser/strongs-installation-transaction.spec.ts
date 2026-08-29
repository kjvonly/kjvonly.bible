import {
	afterEach,
	describe,
	expect,
	it
} from 'vitest';

import type {
	Strongs
} from '$lib/domains/strongs/models/strongs.model';

import {
	STRONGS_DEFINITION_OBJECT_TYPE
} from '$lib/domains/strongs/persistence/strongs-store';

import {
	IndexedDBStrongsInstallationTransaction
} from '$lib/domains/strongs/persistence/strongs-installation-transaction';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource/installation/resource-installation';

const STRONGS_ID =
	'publisher/kjvs/G1';

const INSTALLATION_ID =
	createResourceInstallationId(
		STRONGS_DEFINITION_OBJECT_TYPE,
		STRONGS_ID
	);

describe(
	'IndexedDBStrongsInstallationTransaction',
	() => {
		afterEach(
			async () => {
				const db =
					await getApplicationDB();

				await db.delete(
					DOMAIN_OBJECTS,
					createStoredDomainObjectId(
						STRONGS_DEFINITION_OBJECT_TYPE,
						STRONGS_ID
					)
				);

				await db.delete(
					RESOURCE_INSTALLATIONS,
					INSTALLATION_ID
				);
			}
		);

		it(
			'exposes a transaction-scoped StrongsStore',
			async () => {
				const transaction =
					new IndexedDBStrongsInstallationTransaction(
						getApplicationDB
					);

				const strongs =
					createStrongs();

				await transaction.run(
					async (stores) => {
						await stores
							.strongs
							.put(
								strongs
							);

						const result =
							await stores
								.strongs
								.get(
									strongs.id
								);

						expect(
							result
						).toEqual(
							strongs
						);
					}
				);

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							strongs.id
						)
					)
				).toEqual({
					id:
						'strongs/definition:publisher/kjvs/G1',

					objectType:
						STRONGS_DEFINITION_OBJECT_TYPE,

					objectId:
						strongs.id,

					value:
						strongs
				});
			}
		);

		it(
			'exposes a transaction-scoped ResourceInstallationStore',
			async () => {
				const transaction =
					new IndexedDBStrongsInstallationTransaction(
						getApplicationDB
					);

				const installation =
					createInstallation();

				await transaction.run(
					async (stores) => {
						await stores
							.resourceInstallations
							.put(
								installation
							);

						const result =
							await stores
								.resourceInstallations
								.get(
									STRONGS_DEFINITION_OBJECT_TYPE,
									STRONGS_ID
								);

						expect(
							result
						).toEqual(
							installation
						);
					}
				);

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						INSTALLATION_ID
					)
				).toEqual(
					installation
				);
			}
		);

		it(
			'commits Strong\'s definition and provenance together',
			async () => {
				const transaction =
					new IndexedDBStrongsInstallationTransaction(
						getApplicationDB
					);

				const strongs =
					createStrongs();

				const installation =
					createInstallation();

				await transaction.run(
					async (stores) => {
						await stores
							.strongs
							.put(
								strongs
							);

						await stores
							.resourceInstallations
							.put(
								installation
							);
					}
				);

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							strongs.id
						)
					)
				).toMatchObject({
					objectType:
						STRONGS_DEFINITION_OBJECT_TYPE,

					objectId:
						strongs.id,

					value:
						strongs
				});

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						INSTALLATION_ID
					)
				).toEqual(
					installation
				);
			}
		);

		it(
			'rolls back Strong\'s definition and provenance when the operation fails',
			async () => {
				const transaction =
					new IndexedDBStrongsInstallationTransaction(
						getApplicationDB
					);

				const strongs =
					createStrongs();

				const installation =
					createInstallation();

				await expect(
					transaction.run(
						async (stores) => {
							await stores
								.strongs
								.put(
									strongs
								);

							await stores
								.resourceInstallations
								.put(
									installation
								);

							throw new Error(
								'installation failed'
							);
						}
					)
				).rejects.toThrow(
					'installation failed'
				);

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							strongs.id
						)
					)
				).toBeUndefined();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						INSTALLATION_ID
					)
				).toBeUndefined();
			}
		);

		it(
			'returns the installation operation result after commit',
			async () => {
				const transaction =
					new IndexedDBStrongsInstallationTransaction(
						getApplicationDB
					);

				const result =
					await transaction.run(
						async () =>
							'installation-complete'
					);

				expect(
					result
				).toBe(
					'installation-complete'
				);
			}
		);
	}
);

function createStrongs():
	Strongs {

	return {
		id:
			STRONGS_ID,

		number:
			'G1',

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

function createInstallation():
	ResourceInstallation {

	return {
		id:
			INSTALLATION_ID,

		objectType:
			STRONGS_DEFINITION_OBJECT_TYPE,

		objectId:
			STRONGS_ID,

		publisher:
			'publisher',

		resourceId:
			'kjvonly/strongs/definitions/kjvs/G1',

		eventId:
			'event-id',

		modifiedAt:
			123
	};
}