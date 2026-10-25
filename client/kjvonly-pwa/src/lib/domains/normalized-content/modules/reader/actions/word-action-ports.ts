import type { NormalizedDocument } from '@kjvonly/normalized-content';
import type { ResourceDescriptor } from '$lib/resource';

/** Current Reader facts. The Reader supplies the active descriptor/document snapshot. */
export interface ReaderWordActionEnvironment {
	readonly descriptor: ResourceDescriptor;
	readonly document: NormalizedDocument | undefined;
	readonly publisher: string | undefined;
}

/** Shared transition and presentation capabilities, not a generic service container. */
export interface ReaderWordActionPorts {
	read(): ReaderWordActionEnvironment;
	/** Ask the controller to complete the temporary action and restore its captured state. */
	complete(): Promise<boolean>;
	showError(message: string): void;
}

/** Check that an asynchronous result still belongs to the active logical document. */
export function matchesReaderWordActionEnvironment(
	before: ReaderWordActionEnvironment,
	after: ReaderWordActionEnvironment
): boolean {
	return before.publisher === after.publisher &&
		before.descriptor.metadata.publisher === after.descriptor.metadata.publisher &&
		before.descriptor.metadata.resourceId === after.descriptor.metadata.resourceId &&
		before.descriptor.metadata.modifiedAt === after.descriptor.metadata.modifiedAt;
}
