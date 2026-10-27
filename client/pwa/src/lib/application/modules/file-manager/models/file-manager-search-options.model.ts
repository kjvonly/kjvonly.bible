/** Distinct generic metadata values available to FileManager search filters. */
export interface FileManagerSearchOptions {
	/** Filesystem-mapping publishers. */
	readonly filesystemPublishers: readonly string[];
	/** Mounted root paths represented in the current global snapshot. */
	readonly rootPaths: readonly string[];
	/** Target Resource publishers from ResourceDescriptor metadata. */
	readonly resourcePublishers: readonly string[];
	readonly dataTypes: readonly string[];
	readonly mediaTypes: readonly string[];
	/** Human-facing categories supplied through `resourceMetadata.category`. */
	readonly categories: readonly string[];
}
