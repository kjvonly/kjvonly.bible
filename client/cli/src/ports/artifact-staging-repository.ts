import type {
	StagedArtifactMetadata
} from '../domain/staged-artifact-filename.js';


export type StagedArtifactKind =
	| 'symlink'
	| 'file';


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