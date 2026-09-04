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
}