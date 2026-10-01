import type {
	StoredFilesystemEntry
} from '$lib/infrastructure/persistence/application.db';

import type {
	FilesystemEntry
} from '../../models/filesystem-entry';

import type {
	FilesystemSearchMatch
} from '../../models/filesystem-search-match';

/**
 * Filters filesystem rows by human-facing Resource name or filesystem path.
 *
 * The caller is expected to pre-filter rows through a supported filesystem
 * descriptor-metadata index. An empty search term returns every supplied row.
 */
export function createFilesystemSearchMatches(
	rows:
		readonly StoredFilesystemEntry[],
	text: string
): readonly FilesystemSearchMatch[] {
	const query =
		text
			.trim()
			.toLocaleLowerCase();

	return rows.flatMap(
		(row) => {
			const entry =
				row.value as FilesystemEntry;

			if (
				query.length > 0 &&
				!matchesQuery(
					entry,
					query
				)
			) {
				return [];
			}

			return [{
				publisher:
					row.publisher,
				rootPath:
					row.rootPath,
				entry
			}];
		}
	);
}

function matchesQuery(
	entry: FilesystemEntry,
	query: string
): boolean {
	const name =
		entry.descriptor
			.metadata
			.name
			?.toLocaleLowerCase();

	return entry.path
		.toLocaleLowerCase()
		.includes(
			query
		) ||
		name?.includes(
			query
		) === true;
}
