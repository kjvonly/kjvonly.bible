/** Presentation-only filesystem location context for one Search result. */
export interface FileManagerSearchLocation {
	/** Display label combining filesystem publisher and mounted-root identity. */
	readonly filesystemRootLabel: string;

	/**
	 * Parent directory relative to the mounted root; omitted for root-level
	 * Resources.
	 */
	readonly relativeDirectoryPath?: string;
}
