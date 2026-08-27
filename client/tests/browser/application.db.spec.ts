import {
	beforeEach,
	describe,
	expect,
	it
} from 'vitest';

import {
	DOMAIN_OBJECTS,
	OBJECT_TYPE_INDEX,
	RESOURCE_INSTALLATIONS,
	getApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

import type {
	ResourceInstallation
} from '$lib/resource/installation/resource-installation';

describe(
	'ApplicationDB',
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
			}
		);

		it(
			'stores and retrieves a Domain Object by id',
			async () => {
				const db =
					await getApplicationDB();

				const chapter:
					StoredDomainObject = {
						id:
							'bible/chapter:publisher/kjvs/1_1',

						objectType:
							'bible/chapter',

						objectId:
							'publisher/kjvs/1_1',

						value: {
							number:
								1,

							bookName:
								'Genesis'
						}
					};

				await db.put(
					DOMAIN_OBJECTS,
					chapter
				);

				const result =
					await db.get(
						DOMAIN_OBJECTS,
						chapter.id
					);

				expect(
					result
				).toEqual(
					chapter
				);
			}
		);

		it(
			'queries Domain Objects by object type',
			async () => {
				const db =
					await getApplicationDB();

				const chapter1:
					StoredDomainObject = {
						id:
							'bible/chapter:publisher/kjvs/1_1',

						objectType:
							'bible/chapter',

						objectId:
							'publisher/kjvs/1_1',

						value: {
							number:
								1
						}
					};

				const chapter2:
					StoredDomainObject = {
						id:
							'bible/chapter:publisher/kjvs/1_2',

						objectType:
							'bible/chapter',

						objectId:
							'publisher/kjvs/1_2',

						value: {
							number:
								2
						}
					};

				const strongs:
					StoredDomainObject = {
						id:
							'bible/strongs-definition:publisher/kjvs/G1',

						objectType:
							'bible/strongs-definition',

						objectId:
							'publisher/kjvs/G1',

						value: {
							number:
								'G1'
						}
					};

				await db.put(
					DOMAIN_OBJECTS,
					chapter1
				);

				await db.put(
					DOMAIN_OBJECTS,
					chapter2
				);

				await db.put(
					DOMAIN_OBJECTS,
					strongs
				);

				const result =
					await db.getAllFromIndex(
						DOMAIN_OBJECTS,
						OBJECT_TYPE_INDEX,
						'bible/chapter'
					);

				expect(
					result
				).toHaveLength(
					2
				);

				expect(
					result
				).toEqual(
					expect.arrayContaining([
						chapter1,
						chapter2
					])
				);

				expect(
					result
				).not.toContainEqual(
					strongs
				);
			}
		);

		it(
			'commits Domain Object and Resource Installation together',
			async () => {
				const db =
					await getApplicationDB();

				const chapter:
					StoredDomainObject = {
						id:
							'bible/chapter:publisher/kjvs/1_1',

						objectType:
							'bible/chapter',

						objectId:
							'publisher/kjvs/1_1',

						value: {
							number:
								1
						}
					};

				const installation:
					ResourceInstallation = {
						id:
							'bible/chapter:publisher/kjvs/1_1',

						objectType:
							'bible/chapter',

						objectId:
							'publisher/kjvs/1_1',

						publisher:
							'publisher',

						resourceId:
							'kjvonly/bible/chapters/kjvs/1_1',

						eventId:
							'event-id',

						modifiedAt:
							100
					};

				const tx =
					db.transaction(
						[
							DOMAIN_OBJECTS,
							RESOURCE_INSTALLATIONS
						],
						'readwrite'
					);

				await tx
					.objectStore(
						DOMAIN_OBJECTS
					)
					.put(
						chapter
					);

				await tx
					.objectStore(
						RESOURCE_INSTALLATIONS
					)
					.put(
						installation
					);

				await tx.done;

				expect(
					await db.get(
						DOMAIN_OBJECTS,
						chapter.id
					)
				).toEqual(
					chapter
				);

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						installation.id
					)
				).toEqual(
					installation
				);
			}
		);

		it(
			'rolls back both stores when the transaction is aborted',
			async () => {
				const db =
					await getApplicationDB();

				const chapter:
					StoredDomainObject = {
						id:
							'bible/chapter:publisher/kjvs/1_1',

						objectType:
							'bible/chapter',

						objectId:
							'publisher/kjvs/1_1',

						value: {
							number:
								1
						}
					};

				const installation:
					ResourceInstallation = {
						id:
							'bible/chapter:publisher/kjvs/1_1',

						objectType:
							'bible/chapter',

						objectId:
							'publisher/kjvs/1_1',

						publisher:
							'publisher',

						resourceId:
							'kjvonly/bible/chapters/kjvs/1_1',

						eventId:
							'event-id',

						modifiedAt:
							100
					};

				const tx =
					db.transaction(
						[
							DOMAIN_OBJECTS,
							RESOURCE_INSTALLATIONS
						],
						'readwrite'
					);

				await tx
					.objectStore(
						DOMAIN_OBJECTS
					)
					.put(
						chapter
					);

				await tx
					.objectStore(
						RESOURCE_INSTALLATIONS
					)
					.put(
						installation
					);

				tx.abort();

				await expect(
					tx.done
				).rejects.toThrow();

				expect(
					await db.get(
						DOMAIN_OBJECTS,
						chapter.id
					)
				).toBeUndefined();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						installation.id
					)
				).toBeUndefined();
			}
		);
	}
);