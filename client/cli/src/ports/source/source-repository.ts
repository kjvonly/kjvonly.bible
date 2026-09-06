export type SourcePathType =
	| 'file'
	| 'directory'
	| 'other'
	| 'missing';


export type SourceDirectoryEntryType =
	| 'file'
	| 'directory'
	| 'other';


export interface SourceDirectoryEntry {
	readonly name:
		string;

	readonly path:
		string;

	readonly type:
		SourceDirectoryEntryType;
}


export interface SourceFileMetadata {
	readonly mtimeMs:
		number;

	readonly size:
		number;
}


export interface SourceRepository {
	getPathType(
		path:
			string
	): Promise<
		SourcePathType
	>;


	readDirectory(
		path:
			string
	): Promise<
		readonly SourceDirectoryEntry[]
	>;


	getFileMetadata(
		path:
			string
	): Promise<
		SourceFileMetadata
	>;


	readFile(
		path:
			string
	): Promise<
		Uint8Array
	>;
}