import type {
	FileManagerSearchFileType
} from '../../models/file-manager-search-file-type.model';

/** Generic FileManager metadata filters applied after text matching. */
export interface FileManagerSearchFilters {
	/** Filesystem-mapping publisher, distinct from the target Resource publisher. */
	readonly filesystemPublisher?: string;

	/** Mounted root path within the selected filesystem publisher. */
	readonly rootPath?: string;

	/** Publisher from ResourceDescriptor metadata. */
	readonly resourcePublisher?: string;
	/** Human-facing category supplied through `resourceMetadata.category`. */
	readonly category?: string;
	readonly dataType?: string;
	readonly mediaType?: string;
	readonly fileType?: Exclude<FileManagerSearchFileType, 'all'>;
}

/** One FileManager metadata-search request. */
export interface FileManagerSearchQuery {
	readonly text: string;
	readonly filters?: FileManagerSearchFilters;
}
