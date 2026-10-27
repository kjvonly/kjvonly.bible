import type {
	ResourceDescriptor
} from '$lib/resource';

/**
 * A Note Resource advertised by a mounted filesystem but not installed locally.
 *
 * This is a Notes module/search projection, not a Note Domain Object. Selecting
 * it resolves the descriptor through the normal Resource lifecycle, after which
 * Notes reads the installed Note from its own persistence.
 */
export interface AvailableNote {
	readonly id: string;

	readonly name: string;

	readonly filesystemPublisher: string;

	readonly rootPath: string;

	readonly path: string;

	readonly descriptor:
		ResourceDescriptor;
}
