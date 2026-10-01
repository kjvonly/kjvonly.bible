import type {
	FilesystemEntry
} from './filesystem-entry';

/**
 * One filesystem search match with the source location needed to address it.
 *
 * The target Resource identity remains inside entry.descriptor and may belong
 * to a different publisher than the filesystem that exposes this mapping.
 */
export interface FilesystemSearchMatch {
	readonly publisher: string;

	readonly rootPath: string;

	readonly entry: FilesystemEntry;
}
