import type {
	ResourceDescriptor
} from '$lib/resource';

/** A filesystem mapping whose full placement path and target descriptor are trusted. */
export interface ValidatedFilesystemEntryCandidate {
	/** Canonical Filesystem root supplied by Resource `f` metadata. */
	readonly rootPath: string;

	/** Canonical complete path that is a strict descendant of `rootPath`. */
	readonly path: string;

	/** Target Resource descriptor accepted by the generic Resource validator. */
	readonly descriptor: ResourceDescriptor;
}
