import {
	openDB,
	type DBSchema,
	type IDBPDatabase
} from 'idb';

import type {
	ResourceInstallation
} from '$lib/resource/installation/resource-installation';

import type {
	ResourceReceipt
} from '$lib/resource/receipts/resource-receipt';

export const DOMAIN_OBJECTS =
	'domain_objects';

export const RESOURCE_INSTALLATIONS =
	'resource_installations';

export const RESOURCE_RECEIPTS =
	'resource_receipts';

export const OBJECT_TYPE_INDEX =
	'objectType';

const DATABASE_NAME =
	'kjvonly-application';

const DATABASE_VERSION =
	1;

export interface StoredDomainObject {
	readonly id:
	string;

	readonly objectType:
	string;

	readonly objectId:
	string;

	readonly value:
	unknown;
}

export interface ApplicationDBSchema
	extends DBSchema {

	domain_objects: {
		key:
		string;

		value:
		StoredDomainObject;

		indexes: {
			objectType:
			string;
		};
	};

	resource_installations: {
		key:
		string;

		value:
		ResourceInstallation;
	};

	resource_receipts: {
		key:
		string;

		value:
		ResourceReceipt;
	};
}

export type ApplicationDB =
	IDBPDatabase<
		ApplicationDBSchema
	>;

let databasePromise:
	Promise<ApplicationDB> |
	undefined;

export function getApplicationDB():
	Promise<ApplicationDB> {

	if (!databasePromise) {
		databasePromise =
			openDB<
				ApplicationDBSchema
			>(
				DATABASE_NAME,
				DATABASE_VERSION,
				{
					upgrade(
						db
					) {
						const domainObjects =
							db.createObjectStore(
								DOMAIN_OBJECTS,
								{
									keyPath:
										'id'
								}
							);

						domainObjects
							.createIndex(
								OBJECT_TYPE_INDEX,
								'objectType'
							);

						db.createObjectStore(
							RESOURCE_INSTALLATIONS,
							{
								keyPath:
									'id'
							}
						);

						db.createObjectStore(
							RESOURCE_RECEIPTS,
							{
								keyPath:
									'id'
							}
						);
					}
				}
			);
	}

	return databasePromise;
}

export function createStoredDomainObjectId(
	objectType: string,
	objectId: string
): string {
	return `${objectType}:${objectId}`;
}