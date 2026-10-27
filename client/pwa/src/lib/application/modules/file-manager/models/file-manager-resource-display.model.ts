import type {
	FileManagerResourceIconID
} from './file-manager-icon.model';

/** Generic metadata projection used consistently by FileManager Resource views. */
export interface FileManagerResourceDisplay {
	/** Descriptor name with filesystem basename fallback. */
	readonly name: string;

	/** Generic semantic/physical type label; never derived from Resource content. */
	readonly metadataLabel: string;

	/** Resolved presentation icon; publisher hint first, then dataType fallback. */
	readonly iconID: FileManagerResourceIconID;
}
