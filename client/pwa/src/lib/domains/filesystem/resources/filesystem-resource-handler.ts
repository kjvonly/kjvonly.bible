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

/** Validator contract consumed by the Filesystem Resource handler. */
export interface FilesystemResourceValidator
	extends ResourceValidator<
		FilesystemEntryCandidate,
		ValidatedFilesystemEntryCandidate
	> {
	/** Validates Filesystem Resource root metadata independently of entry count. */
	validateRootPath(
		rootPath: string
	): void;
}

/** Installer contract consumed by the Filesystem Resource handler. */
export interface FilesystemResourceInstaller {
	/**
	 * Persists validated mappings for one decoded Filesystem Resource.
	 *
	 * @param resource Source Resource whose provenance/currentness is recorded.
	 * @param candidates Validated Filesystem mappings proposed by the Resource.
	 */
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
			FilesystemResourceValidator,
		private readonly installer:
			FilesystemResourceInstaller
	) {}

	/**
	 * Validates payload and root metadata, then interprets and installs mappings.
	 *
	 * @param resource Decoded Resource dispatched by Filesystem Resource Type.
	 */
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

		const rootPath =
			filesystemResource.metadata?.f;

		if (
			rootPath === undefined ||
			rootPath.length === 0
		) {
			throw new Error(
				'Filesystem Resource is missing f metadata.'
			);
		}

		this.validator.validateRootPath(
			rootPath
		);

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
