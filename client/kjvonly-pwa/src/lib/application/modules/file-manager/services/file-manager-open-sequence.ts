import type {
	FilesystemEntry
} from '$lib/domains/filesystem';

import type {
	ResourceModuleOpenSequence
} from '../../modules/resource-module-resolver';

/** An entry's position in the displayed list before filtering by file type. */
interface DisplayedFile {
	readonly entry: FilesystemEntry;
	readonly displayedIndex: number;
}

/**
 * Builds a viewer-independent sequence from the File Manager's displayed order.
 * `selectedIndex` refers to the unfiltered list; we translate it to the
 * same-type sequence index after filtering. File type comes from the filename,
 * not the Resource payload or destination Module.
 */
export function createFileManagerOpenSequence(
	entries: readonly FilesystemEntry[],
	selectedIndex: number
): ResourceModuleOpenSequence | undefined {
	const selected = entries[selectedIndex];
	if (!selected) {
		return undefined;
	}

	const selectedType = fileExtension(selected.path);
	if (!selectedType) {
		// Extensionless files retain the normal single-Resource opening behavior.
		return undefined;
	}

	const sameTypeFiles = filterFilesByExtension(entries, selectedType);
	if (sameTypeFiles.length < 2) {
		return undefined;
	}

	const index = findSelectedIndexInFilteredSequence(sameTypeFiles, selectedIndex);
	if (index === -1) {
		return undefined;
	}

	return {
		items: sameTypeFiles.map(({ entry }) => ({
			descriptor: entry.descriptor,
			fileName: entry.path.slice(entry.path.lastIndexOf('/') + 1)
		})),
		index
	};
}

/** Retains displayed positions so the selected file can be found after filtering. */
function filterFilesByExtension(
	entries: readonly FilesystemEntry[],
	extension: string
): DisplayedFile[] {
	const matching: DisplayedFile[] = [];
	entries.forEach((entry, displayedIndex) => {
		if (fileExtension(entry.path) === extension) {
			matching.push({ entry, displayedIndex });
		}
	});
	return matching;
}

/** Converts the index from Browse/Search results into the filtered viewer index. */
function findSelectedIndexInFilteredSequence(
	files: readonly DisplayedFile[],
	selectedDisplayedIndex: number
): number {
	return files.findIndex(({ displayedIndex }) => displayedIndex === selectedDisplayedIndex);
}

/** Filename extension with well-known compound extensions taking precedence. */
function fileExtension(path: string): string | undefined {
	const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
	for (const suffix of ['.nd.json', '.tar.gz', '.tar.bz2', '.tar.xz']) {
		if (name.endsWith(suffix) && name.length > suffix.length) {
			return suffix;
		}
	}

	const dot = name.lastIndexOf('.');
	return dot > 0 && dot < name.length - 1
		? name.slice(dot)
		: undefined;
}
