/**
 * Untrusted filesystem mapping interpreted from decoded Resource content.
 *
 * `descriptor` remains unknown until the Filesystem validator delegates to the
 * generic ResourceDescriptorValidator.
 */
export interface FilesystemEntryCandidate {
	readonly rootPath: string;
	readonly path: string;
	readonly descriptor: unknown;
}
