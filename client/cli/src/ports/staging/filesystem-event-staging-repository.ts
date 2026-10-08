import {
	SignedNostrEvent
} from '#domain/event/nostr-event.js';


/** Metadata for one generated Filesystem event currently present in staging. */
export interface StagedFilesystemEventEntry {
	readonly path:
		string;

	readonly filesystemName:
		string;

	readonly inputRevision:
		string;

	readonly createdAt:
		number;

	readonly eventId:
		string;
}


/** Request to atomically replace one manifest Filesystem's staged event. */
export interface StageFilesystemEventRequest {
	readonly stagingRoot:
		string;

	readonly filesystemName:
		string;

	readonly inputRevision:
		string;

	readonly event:
		SignedNostrEvent;

	readonly previous?:
		StagedFilesystemEventEntry;
}


/** Persistence boundary for generated Filesystem Resource events. */
export interface FilesystemEventStagingRepository {
	/** Lists staged Filesystem event metadata without reading event JSON. */
	list(
		stagingRoot:
			string
	): Promise<readonly StagedFilesystemEventEntry[]>;

	/** Reads and validates one exact staged Filesystem event. */
	read(
		entry:
			StagedFilesystemEventEntry
	): Promise<SignedNostrEvent>;

	/** Atomically stages a new Filesystem event and removes its superseded file. */
	stage(
		request:
			StageFilesystemEventRequest
	): Promise<StagedFilesystemEventEntry>;

	/** Removes obsolete local Filesystem staging only; this is not client deletion. */
	remove(
		entry:
			StagedFilesystemEventEntry
	): Promise<void>;
}
