import type {
	ResourceDescriptor
} from '$lib/resource';

/** A filesystem mapping whose path and target Resource descriptor are trusted. */
export interface ValidatedFilesystemEntryCandidate {
	readonly rootPath: string;
	readonly path: string;
	readonly descriptor: ResourceDescriptor;
}
