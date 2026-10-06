import type {
	DecodedResourceContent,
	ResourceDataTypeHandler,
	ResourceHandler,
	ResourceValidator
} from '$lib/resource';

import type {
	FilesystemEntryCandidate
} from './filesystem-entry-candidate';

import type {
	DecodedFilesystemResourceContent,
	FilesystemInterpreter
} from './filesystem-interpreter';

import {
	FILESYSTEM_RESOURCE_TYPE,
	type FilesystemEntriesResourceData
} from './filesystem-resource';

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
 * Connects decoded Filesystem Resources to the specialized Filesystem lifecycle.
 *
 * Resource Type selects this lifecycle. The Filesystem semantic data contract is
 * still validated explicitly before Domain interpretation, matching the
 * dataType/dataVersion boundary used by the generic Resource path.
 */
export class FilesystemResourceHandler
	implements ResourceHandler {

	readonly resourceType =
		FILESYSTEM_RESOURCE_TYPE;

	constructor(
		private readonly dataType:
			ResourceDataTypeHandler<
				FilesystemEntriesResourceData
			>,
		private readonly interpreter:
			Pick<
				FilesystemInterpreter,
				'resourceType' |
				'interpret'
			>,
		private readonly validator:
			ResourceValidator<
				FilesystemEntryCandidate,
				ValidatedFilesystemEntryCandidate
			>,
		private readonly installer:
			FilesystemResourceInstaller
	) {}

	/** Validates the semantic payload, then interprets and installs mappings. */
	async handle(
		resource:
			DecodedResourceContent
	): Promise<void> {
		if (
			resource.dataType !==
				this.dataType.dataType ||
			resource.dataVersion !==
				this.dataType.dataVersion
		) {
			throw new Error(
				`Unsupported Filesystem Resource data type: ${resource.dataType}@${resource.dataVersion}`
			);
		}

		const value =
			this.dataType.validate(
				resource.value
			);

		const filesystemResource:
			DecodedFilesystemResourceContent = {
				...resource,
				value
			};

		const candidates =
			Array.from(
				this.interpreter.interpret(
					filesystemResource
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
			filesystemResource,
			validated
		);
	}
}
