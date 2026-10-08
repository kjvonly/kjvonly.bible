/**
 * Untrusted filesystem mapping interpreted from decoded Resource content.
 *
 * `descriptor` remains unknown until the Filesystem validator delegates to the
 * generic ResourceDescriptorValidator.
 */
export interface FilesystemEntryCandidate {
	/** Filesystem root supplied by the source Resource `f` metadata. */
	readonly rootPath: string;

	/** Complete filesystem path supplied by the Resource payload key. */
	readonly path: string;

	/** Untrusted target Resource descriptor carried by this mapping. */
	readonly descriptor: unknown;
}
