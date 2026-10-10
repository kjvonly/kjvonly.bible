/** One private, not-yet-selected staging generation for a directory import. */
export interface ImportStagingGeneration {
	/** Staging root used by the shared Manifest executor. */
	readonly stagingRoot: string;
	/** Removes this failed/uncommitted generation, not the previous generation. */
	discard(): Promise<void>;
}

/**
 * Prepares a private staging generation for an import. The Node adapter seeds
 * from the generation selected by the previous generated Manifest, if any, to
 * retain signed-event and artifact reuse. This is a local publication pointer,
 * not proof that those events were uploaded to any remote service.
 */
export interface ImportStagingWorkspace {
	/**
	 * @param baselineRoot Staging path configured by the original publication Manifest.
	 * @param outputManifestPath Generated Manifest that selects the last successful generation.
	 */
	prepare(baselineRoot: string, outputManifestPath: string): Promise<ImportStagingGeneration>;
}
