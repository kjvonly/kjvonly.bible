import type {
	DecodedResourceContent,
	ResourceHandler,
	ResourceInterpreter,
	ResourceValidator
} from '$lib/resource';

import type {
	FilesystemEntryCandidate
} from './filesystem-entry-candidate';

import {
	FILESYSTEM_RESOURCE_TYPE
} from './filesystem-interpreter';

import type {
	ValidatedFilesystemEntryCandidate
} from './validated-filesystem-entry-candidate';

/** Installer contract consumed by the Filesystem Resource handler. */
export interface FilesystemResourceInstaller {
	install(
		resource:
			DecodedResourceContent,
		candidates:
			readonly ValidatedFilesystemEntryCandidate[]
	): Promise<void>;
}

/**
 * Connects generic decoded `fs` Resources to the Filesystem domain pipeline.
 *
 * Handling mounts filesystem metadata only; target descriptors remain
 * unresolved until later application policy explicitly selects an entry to load.
 */
export class FilesystemResourceHandler
	implements ResourceHandler {

	readonly resourceType =
		FILESYSTEM_RESOURCE_TYPE;

	constructor(
		private readonly interpreter:
			ResourceInterpreter<
				FilesystemEntryCandidate
			>,
		private readonly validator:
			ResourceValidator<
				FilesystemEntryCandidate,
				ValidatedFilesystemEntryCandidate
			>,
		private readonly installer:
			FilesystemResourceInstaller
	) {}

	/** Interprets, validates, and installs filesystem mappings. */
	async handle(
		resource:
			DecodedResourceContent
	): Promise<void> {
		const candidates =
			Array.from(
				this.interpreter.interpret(
					resource
				)
			);

		const validated =
			candidates.map(
				(candidate) =>
					this.validator.validate(
						candidate
					)
			);

		await this.installer.install(
			resource,
			validated
		);
	}
}
