import {
	openDB,
	type DBSchema,
	type IDBPDatabase
} from 'idb';

import {
	type ResourceInstallation,
	type ResourceReceipt
} from '$lib/resource';


import type {
	OutboxEntry,
	OutboxStatus
} from '$lib/application';

import type {
	NostrEvent
} from '$lib/infrastructure/nostr/events/models/nostr-event';

export const DOMAIN_OBJECTS =
	'domain_objects';

export const RESOURCE_INSTALLATIONS =
	'resource_installations';

export const FILESYSTEM_ENTRIES =
	'filesystem_entries';

export const RESOURCE_RECEIPTS =
	'resource_receipts';

export const OUTBOX =
	'outbox';

export const NOSTR_EVENTS =
	'nostr_events';

export const OBJECT_TYPE_INDEX =
	'objectType';

export const FILESYSTEM_ENTRY_PUBLISHER_ROOT_PATH_INDEX =
	'publisherRootPath';

export const FILESYSTEM_ENTRY_DATA_TYPE_INDEX =
	'dataType';

export const FILESYSTEM_ENTRY_CATEGORY_INDEX =
	'category';

export const OUTBOX_STATUS_INDEX =
	'status';

export const NOSTR_EVENT_KIND_INDEX =
	'kind';

export const NOSTR_EVENT_PUBKEY_INDEX =
	'pubkey';

export const NOSTR_EVENT_KIND_PUBKEY_INDEX =
	'kindPubkey';

const DATABASE_NAME =
	'kjvonly-application';

const DATABASE_VERSION =
	6;

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

export interface StoredFilesystemEntry {
	readonly id:
		string;

	readonly publisher:
		string;

	readonly rootPath:
		string;

	readonly path:
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

	filesystem_entries: {
		key:
		string;

		value:
		StoredFilesystemEntry;

		indexes: {
			publisherRootPath:
			[string, string];

			dataType:
				string;

			category:
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

	nostr_events: {
		key:
		string;

		value:
		NostrEvent;

		indexes: {
			kind:
				number;

			pubkey:
				string;

			kindPubkey:
				[number, string];
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
						db,
						_oldVersion,
						_newVersion,
						transaction
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
								FILESYSTEM_ENTRIES
							)
						) {
							const filesystemEntries =
								db.createObjectStore(
									FILESYSTEM_ENTRIES,
									{
										keyPath:
											'id'
									}
								);

							filesystemEntries
								.createIndex(
									FILESYSTEM_ENTRY_PUBLISHER_ROOT_PATH_INDEX,
									[
										'publisher',
										'rootPath'
									]
								);

							filesystemEntries
								.createIndex(
									FILESYSTEM_ENTRY_DATA_TYPE_INDEX,
									'value.descriptor.metadata.dataType'
								);

							filesystemEntries
								.createIndex(
									FILESYSTEM_ENTRY_CATEGORY_INDEX,
									'value.descriptor.metadata.category'
								);
						} else {
							const filesystemEntries =
								transaction.objectStore(
									FILESYSTEM_ENTRIES
								);

							if (
								!filesystemEntries.indexNames.contains(
									FILESYSTEM_ENTRY_DATA_TYPE_INDEX
								)
							) {
								filesystemEntries.createIndex(
									FILESYSTEM_ENTRY_DATA_TYPE_INDEX,
									'value.descriptor.metadata.dataType'
								);
							}

							if (
								!filesystemEntries.indexNames.contains(
									FILESYSTEM_ENTRY_CATEGORY_INDEX
								)
							) {
								filesystemEntries.createIndex(
									FILESYSTEM_ENTRY_CATEGORY_INDEX,
									'value.descriptor.metadata.category'
								);
							}
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

						if (
							!db.objectStoreNames.contains(
								NOSTR_EVENTS
							)
						) {
							const nostrEvents =
								db.createObjectStore(
									NOSTR_EVENTS,
									{
										keyPath:
											'key'
									}
								);

							nostrEvents.createIndex(
								NOSTR_EVENT_KIND_INDEX,
								'kind'
							);

							nostrEvents.createIndex(
								NOSTR_EVENT_PUBKEY_INDEX,
								'pubkey'
							);

							nostrEvents.createIndex(
								NOSTR_EVENT_KIND_PUBKEY_INDEX,
								[
									'kind',
									'pubkey'
								]
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