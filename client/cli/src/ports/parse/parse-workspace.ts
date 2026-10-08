/** Source file discovered by the workspace for one parse batch. */
export interface ParseSourceFile {
	/** Workspace-native path used for filesystem reads. */
	readonly path: string;

	/** Root-relative POSIX-style provenance stored with normalized output. */
	readonly relativePath: string;
}

/** Controls whether a completed parse artifact may replace an existing output path. */
export interface ParseOutputWriteOptions {
	readonly overwrite: boolean;
}

/** Filesystem capabilities required by the parse application workflow. */
export interface ParseWorkspace {
	/**
	 * Recursively discovers source files accepted by the requested parse format.
	 *
	 * @param rootDirectory Root directory that owns source-relative provenance.
	 * @param extensions Lowercase or mixed-case file extensions accepted by the caller.
	 * @returns Deterministically ordered source files with native and root-relative paths.
	 */
	findSourceFiles(
		rootDirectory: string,
		extensions: readonly string[]
	): Promise<readonly ParseSourceFile[]>;

	/**
	 * Produces a comparison key for detecting output paths that may alias on the
	 * workspace filesystem or on filesystems targeted for portable output.
	 *
	 * @param path Candidate output path.
	 * @returns Comparison-only key. The caller must continue using the original
	 * path for filesystem IO and user-facing output.
	 */
	getPathCollisionKey(
		path: string
	): string;

	/**
	 * Tests whether a workspace path currently exists. This is a preflight aid only;
	 * callers must not treat it as an atomic publication guarantee.
	 *
	 * @param path Workspace-native path to inspect.
	 * @returns Whether the path existed when the check completed.
	 */
	pathExists(
		path: string
	): Promise<boolean>;

	/**
	 * Reads one complete UTF-8 source document.
	 *
	 * @param path Workspace-native source path.
	 * @returns Complete source text supplied to the parser.
	 */
	readTextFile(
		path: string
	): Promise<string>;

	/**
	 * Publishes one complete text artifact without exposing a partially written
	 * destination. The implementation must enforce overwrite intent at the final
	 * publication step rather than relying on a preceding existence check.
	 *
	 * @param path Final output path.
	 * @param content Complete serialized artifact to publish.
	 * @param options Output replacement policy that must remain race-safe.
	 * @returns Promise resolved only after the complete artifact is published.
	 */
	writeOutputAtomically(
		path: string,
		content: string,
		options: ParseOutputWriteOptions
	): Promise<void>;
}
