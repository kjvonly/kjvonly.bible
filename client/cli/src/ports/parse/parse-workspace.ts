export interface ParseSourceFile {
	readonly path: string;
	readonly relativePath: string;
}

/** Controls whether a parse artifact may replace an existing filesystem path. */
export interface ParseTextWriteOptions {
	readonly overwrite: boolean;
}

export interface ParseWorkspace {
	findSourceFiles(
		rootDirectory: string,
		extensions: readonly string[]
	): Promise<readonly ParseSourceFile[]>;

	pathExists(
		path: string
	): Promise<boolean>;

	readTextFile(
		path: string
	): Promise<string>;

	writeTextFile(
		path: string,
		content: string,
		options: ParseTextWriteOptions
	): Promise<void>;
}
