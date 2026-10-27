import type {
	LocatedFilesystemEntry
} from '../../models/located-filesystem-entry.model';

import type {
	FileManagerIndexedFileType
} from '../../models/file-manager-search-file-type.model';

import {
	classifySearchFileType
} from '../../resolvers/file-manager-search-file-type-resolver';

/**
 * Compact metadata projection transferred into the FileManager search worker.
 *
 * This intentionally carries only searchable/filterable metadata. The full
 * ResourceDescriptor stays on the main thread in LocatedFilesystemEntry.
 */
export interface FileManagerSearchDocument {
	/** Stable runtime key for one filesystem mapping within one mounted root. */
	readonly id: string;
	readonly name: string;
	readonly path: string;
	/** Publisher of the filesystem mapping that exposed this Resource. */
	readonly filesystemPublisher: string;
	readonly rootPath: string;
	/** Publisher of the target Resource described by the filesystem entry. */
	readonly resourcePublisher: string;
	/** Canonical application Resource type used by routing/contracts. */
	readonly resourceType: string;
	/** Optional human-facing category supplied through Resource metadata. */
	readonly category: string;
	readonly dataType: string;
	readonly mediaType: string;
	readonly fileType: FileManagerIndexedFileType;
}

/** Projects one located filesystem mapping into worker-safe search metadata. */
export function createFileManagerSearchDocument(
	located: LocatedFilesystemEntry
): FileManagerSearchDocument {
	const descriptor =
		located.entry.descriptor;
	const metadata =
		descriptor.metadata;
	const category =
		descriptor.resourceMetadata?.category?.trim() ?? '';

	return {
		id: createLocatedFilesystemEntryId(located),
		name:
			metadata.name?.trim() ?? '',
		path:
			located.entry.path,
		filesystemPublisher:
			located.filesystemPublisher,
		rootPath:
			located.rootPath,
		resourcePublisher:
			metadata.publisher,
		resourceType:
			metadata.resourceType,
		category,
		dataType:
			metadata.dataType,
		mediaType:
			metadata.mediaType,
		fileType:
			classifySearchFileType(
				metadata.dataType,
				metadata.mediaType,
				metadata.resourceType,
				category
			)
	};
}

/**
 * Creates the runtime search key from filesystem provenance.
 *
 * Resource identity alone is insufficient because the same Resource may be
 * exposed by more than one filesystem publisher/root/path mapping.
 */
export function createLocatedFilesystemEntryId(
	located: LocatedFilesystemEntry
): string {
	return JSON.stringify([
		located.filesystemPublisher,
		located.rootPath,
		located.entry.path
	]);
}
