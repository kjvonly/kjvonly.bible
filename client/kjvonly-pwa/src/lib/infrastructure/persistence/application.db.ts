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

import type {
	OutboxEntry,
	OutboxStatus
} from '$lib/resource/outbox/outbox-entry';

export const DOMAIN_OBJECTS =
	'domain_objects';

export const RESOURCE_INSTALLATIONS =
	'resource_installations';

export const RESOURCE_RECEIPTS =
	'resource_receipts';

export const OUTBOX =
	'outbox';

export const OBJECT_TYPE_INDEX =
	'objectType';

export const OUTBOX_STATUS_INDEX =
	'status';

const DATABASE_NAME =
	'kjvonly-application';

const DATABASE_VERSION =
	2;

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

	outbox: {
		key:
		string;

		value:
		OutboxEntry;

		indexes: {
			status:
			OutboxStatus;
		};
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
						if (
							!db.objectStoreNames.contains(
								DOMAIN_OBJECTS
							)
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
						}

						if (
							!db.objectStoreNames.contains(
								RESOURCE_INSTALLATIONS
							)
						) {
							db.createObjectStore(
								RESOURCE_INSTALLATIONS,
								{
									keyPath:
										'id'
								}
							);
						}

						if (
							!db.objectStoreNames.contains(
								RESOURCE_RECEIPTS
							)
						) {
							db.createObjectStore(
								RESOURCE_RECEIPTS,
								{
									keyPath:
										'id'
								}
							);
						}

						if (
							!db.objectStoreNames.contains(
								OUTBOX
							)
						) {
							const outbox =
								db.createObjectStore(
									OUTBOX,
									{
										keyPath:
											'id'
									}
								);

							outbox.createIndex(
								OUTBOX_STATUS_INDEX,
								'status'
							);
						}
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