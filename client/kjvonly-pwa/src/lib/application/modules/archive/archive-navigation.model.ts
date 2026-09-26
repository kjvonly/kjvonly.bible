export const ARCHIVE_VIEWS = {
	ROOT: 'archive.root',
	IMPORT: 'archive.import',
	EXPORT: 'archive.export'
} as const;

export type ArchiveView =
	typeof ARCHIVE_VIEWS[
		keyof typeof ARCHIVE_VIEWS
	];
