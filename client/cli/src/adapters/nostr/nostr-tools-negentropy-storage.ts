import {
	nip77
} from 'nostr-tools';

import type {
	NostrReconciliationEntry
} from '../../domain/nostr-reconciliation-entry.js';


export function createNostrToolsNegentropyStorage(
	events:
		readonly NostrReconciliationEntry[]
): nip77.NegentropyStorageVector {

	const storage =
		new nip77
			.NegentropyStorageVector();


	for (
		const event
		of events
	) {
		storage.insert(
			event.createdAt,
			event.eventId
		);
	}


	storage.seal();


	return storage;
}