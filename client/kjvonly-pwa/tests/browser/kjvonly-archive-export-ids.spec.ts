import {
	beforeEach,
	describe,
	expect,
	it
} from 'vitest';

import {
	KJVOnlyArchiveCodec
} from '$lib/application/archive/kjvonly-archive-codec';

import {
	KJVOnlyArchiveService
} from '$lib/application/archive/kjvonly-archive.service';

import {
	createBrowserKJVOnlyArchiveWorkerClient
} from '$lib/application/archive/worker/kjvonly-archive-worker-client';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	createStoredDomainObjectId,
	getApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

import type {
	ResourceInstallation
} from '$lib/resource';

const OBJECT_TYPE =
	'archive/browser-test';

const PUBLISHER =
	'a'.repeat(
		64
	);

describe(
	'KJVOnly Archive exportIds browser integration',
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
			'exports only requested Domain Object IDs from IndexedDB through the real Archive worker',
			async () => {
				const selected =
					createArchiveRecord(
						'selected'
					);

				const unselected =
					createArchiveRecord(
						'unselected'
					);

				const db =
					await getApplicationDB();

				const seed =
					db.transaction(
						[
							DOMAIN_OBJECTS,
							RESOURCE_INSTALLATIONS
						],
						'readwrite'
					);

				await seed
					.objectStore(
						DOMAIN_OBJECTS
					)
					.put(
						selected.domainObject
					);

				await seed
					.objectStore(
						RESOURCE_INSTALLATIONS
					)
					.put(
						selected.installation
					);

				await seed
					.objectStore(
						DOMAIN_OBJECTS
					)
					.put(
						unselected.domainObject
					);

				await seed
					.objectStore(
						RESOURCE_INSTALLATIONS
					)
					.put(
						unselected.installation
					);

				await seed.done;

				const service =
					new KJVOnlyArchiveService(
						createBrowserKJVOnlyArchiveWorkerClient()
					);

				const archiveBytes =
					await service.exportIds({
						ids: [
							selected.id
						]
					});

				const archive =
					await new KJVOnlyArchiveCodec()
						.decode(
							archiveBytes
						);

				expect(
					Object.keys(
						archive.domain_objects
					)
				).toEqual([
					selected.id
				]);

				expect(
					Object.keys(
						archive.resource_installations
					)
				).toEqual([
					selected.id
				]);

				expect(
					archive.domain_objects[
						selected.id
					]
				).toEqual(
					selected.domainObject
				);

				expect(
					archive.resource_installations[
						selected.id
					]
				).toEqual(
					selected.installation
				);
			}
		);
	}
);

function createArchiveRecord(
	objectId: string
): {
	readonly id:
		string;

	readonly domainObject:
		StoredDomainObject;

	readonly installation:
		ResourceInstallation;
} {
	const id =
		createStoredDomainObjectId(
			OBJECT_TYPE,
			objectId
		);

	return {
		id,

		domainObject: {
			id,
			objectType:
				OBJECT_TYPE,
			objectId,
			value: {
				id:
					objectId,
				label:
					objectId
			}
		},

		installation: {
			id,
			objectType:
				OBJECT_TYPE,
			objectId,
			publisher:
				PUBLISHER,
			resourceId:
				`archive/browser-test/${objectId}`,
			modifiedAt:
				1
		}
	};
}
