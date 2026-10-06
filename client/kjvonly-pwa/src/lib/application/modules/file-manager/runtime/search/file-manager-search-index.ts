import FlexSearch from 'flexsearch';

import type {
	FileManagerSearchDocument
} from './file-manager-search-document';

import type {
	FileManagerSearchFilters,
	FileManagerSearchQuery
} from './file-manager-search.model';

const SEARCHABLE_FIELDS = [
	'name',
	'path',
	'filesystemPublisher',
	'rootPath',
	'resourcePublisher',
	'resourceType',
	'category',
	'dataType',
	'mediaType'
] as const;

/**
 * In-memory metadata index used only by the FileManager search worker.
 * Text matching produces candidates; generic facet filters are then exact-match.
 */
export class FileManagerSearchIndex {
	private flexSearchIndex = createFlexSearchIndex();

	private readonly documentsById =
		new Map<string, FileManagerSearchDocument>();

	/** Replaces the current in-memory search snapshot. */
	async initialize(
		documents: readonly FileManagerSearchDocument[]
	): Promise<void> {
		this.flexSearchIndex = createFlexSearchIndex();
		this.documentsById.clear();

		for (const document of documents) {
			this.documentsById.set(
				document.id,
				document
			);

			await this.flexSearchIndex.addAsync(
				document.id,
				document
			);
		}
	}

	/** Searches generic filesystem/Resource metadata without loading targets. */
	async search(
		query: FileManagerSearchQuery
	): Promise<readonly string[]> {
		const text = query.text.trim();

		const candidates =
			text.length === 0
				? Array.from(
					this.documentsById.values()
				)
				: await this.searchText(
					text
				);

		return candidates
			.filter(
				(document) =>
					matchesFilters(
						document,
						query.filters
					)
			)
			.sort(compareDocuments)
			.map((document) => document.id);
	}

	private async searchText(
		text: string
	): Promise<FileManagerSearchDocument[]> {
		const matches =
			await this.flexSearchIndex.searchAsync(
				text,
				{
					index: [...SEARCHABLE_FIELDS]
				}
			);

		const ids = new Set<string>();

		for (const match of matches) {
			for (const result of match.result) {
				ids.add(String(result));
			}
		}

		return Array.from(ids)
			.map(
				(id) => this.documentsById.get(id)
			)
			.filter(
				(document): document is FileManagerSearchDocument =>
					document !== undefined
			);
	}
}

/** Creates a fresh FlexSearch document index for one in-memory snapshot. */
function createFlexSearchIndex() {
	return new FlexSearch.Document({
		document: {
			id: 'id',
			index: [...SEARCHABLE_FIELDS]
		}
	});
}

/** Applies exact metadata facets after optional full-text candidate matching. */
function matchesFilters(
	document: FileManagerSearchDocument,
	filters: FileManagerSearchFilters | undefined
): boolean {
	if (!filters) {
		return true;
	}

	return (
		(filters.filesystemPublisher === undefined ||
			document.filesystemPublisher === filters.filesystemPublisher) &&
		(filters.rootPath === undefined ||
			document.rootPath === filters.rootPath) &&
		(filters.resourcePublisher === undefined ||
			document.resourcePublisher === filters.resourcePublisher) &&
		(filters.category === undefined ||
			document.category === filters.category) &&
		(filters.dataType === undefined ||
			document.dataType === filters.dataType) &&
		(filters.mediaType === undefined ||
			document.mediaType === filters.mediaType) &&
		(filters.fileType === undefined ||
			document.fileType === filters.fileType)
	);
}

/** Provides deterministic display ordering independent of FlexSearch ranking. */
function compareDocuments(
	left: FileManagerSearchDocument,
	right: FileManagerSearchDocument
): number {
	const leftName =
		left.name || left.path;
	const rightName =
		right.name || right.path;

	const byName = leftName.localeCompare(
		rightName,
		undefined,
		{ sensitivity: 'base' }
	);

	if (byName !== 0) {
		return byName;
	}

	const byPublisher =
		left.filesystemPublisher.localeCompare(
			right.filesystemPublisher
		);

	if (byPublisher !== 0) {
		return byPublisher;
	}

	const byRoot =
		left.rootPath.localeCompare(
			right.rootPath
		);

	if (byRoot !== 0) {
		return byRoot;
	}

	return left.path.localeCompare(
		right.path
	);
}
