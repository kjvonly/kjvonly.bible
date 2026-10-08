import { StagedArtifactMetadata } from "#domain/staging/staged-artifact-filename.js";

/** Physical representation used for one locally staged external artifact. */
export type StagedArtifactKind =
	| 'symlink'
	| 'file';


/** Metadata and local path for one staged external artifact. */
export interface StagedArtifactEntry {
	readonly path:
		string;

	readonly metadata:
		StagedArtifactMetadata;

	readonly kind:
		StagedArtifactKind;

	readonly size:
		number;
}


/** Request to stage source bytes unchanged, typically through an identity link. */
export interface StageIdentityArtifactRequest {
	readonly stagingRoot:
		string;

	readonly resourceName:
		string;

	readonly key:
		string;

	readonly sourcePath:
		string;

	readonly sourceMtimeMs:
		number;

	readonly sourceSize:
		number;

	readonly artifactRevision:
		string;

	readonly extension:
		string;

	readonly previous?:
		StagedArtifactEntry;
}


/** Request to stage already-materialized artifact bytes. */
export interface StageMaterializedArtifactRequest {
	readonly stagingRoot:
		string;

	readonly resourceName:
		string;

	readonly key:
		string;

	readonly bytes:
		Uint8Array;

	readonly sourceMtimeMs:
		number;

	readonly sourceSize:
		number;

	readonly artifactRevision:
		string;

	readonly extension:
		string;

	readonly previous?:
		StagedArtifactEntry;
}


/** Persistence boundary for desired local external-artifact staging state. */
export interface ArtifactStagingRepository {
	list(
		stagingRoot:
			string,

		resourceName:
			string
	): Promise<
		readonly StagedArtifactEntry[]
	>;


	stageIdentity(
		request:
			StageIdentityArtifactRequest
	): Promise<
		StagedArtifactEntry
	>;


	stageMaterialized(
		request:
			StageMaterializedArtifactRequest
	): Promise<
		StagedArtifactEntry
	>;


	remove(
		entry:
			StagedArtifactEntry
	): Promise<void>;
}