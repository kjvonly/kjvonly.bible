import type {
	FilesystemEntry,
	FilesystemRoot
} from '$lib/domains/filesystem';

import type {
	LocatedFilesystemEntry
} from '../models/located-filesystem-entry.model';

import type {
	FileManagerResourceDisplay
} from '../models/file-manager-resource-display.model';

import type {
	FileManagerRootGroup
} from '../models/file-manager-root.model';

import type {
	FileManagerSearchOptions
} from '../models/file-manager-search-options.model';

import type {
	FileManagerSearchLocation
} from '../models/file-manager-search-location.model';

import {
	resolveResourceIconID
} from '../resolvers/file-manager-resource-icon-resolver';

import {
	FileManagerSearchRuntime
} from '../runtime/search/file-manager-search-runtime';
import type {
	FileManagerSearchQuery
} from '../runtime/search/file-manager-search.model';

import type {
	FileManagerBreadcrumb,
	FileManagerDirectory,
	FileManagerResource
} from '../models/file-manager-tree.model';

/** Filesystem read surface required by FileManager projections/search. */
interface FileManagerFilesystemReader {
	listRoots(): Promise<readonly FilesystemRoot[]>;

	listByRootPath(
		filesystemPublisher: string,
		rootPath: string
	): Promise<readonly FilesystemEntry[]>;
}

/** Search-runtime contract owned by FileManagerService rather than Svelte views. */
interface FileManagerSearchRuntimePort {
	readonly isActive: boolean;

	initialize(
		entries: readonly LocatedFilesystemEntry[]
	): Promise<void>;

	search(
		query: FileManagerSearchQuery
	): Promise<readonly LocatedFilesystemEntry[]>;

	dispose(): void;
}

/**
 * Indicates that the active FileManager search runtime was lost and must be rebuilt.
 *
 * Ordinary query failures do not use this error; callers may retry those against
 * the existing runtime.
 */
export class FileManagerSearchUnavailableError extends Error {
	readonly cause: unknown;

	constructor(cause: unknown) {
		super('FileManager search runtime is unavailable.');
		this.name = 'FileManagerSearchUnavailableError';
		this.cause = cause;
	}
}

/** Factory seam that keeps Worker construction testable. */
type FileManagerSearchRuntimeFactory =
	() => FileManagerSearchRuntimePort;

/** Mutable construction node used only while projecting a flat root into a tree. */
interface MutableDirectory {
	readonly name: string;
	readonly path: string;
	readonly directories:
		Map<string, MutableDirectory>;
	readonly resources:
		Map<string, FileManagerResource>;
}

/**
 * Owns FileManager's reconstructable runtime projections and metadata search.
 *
 * Filesystem persistence remains the source of truth. This service projects flat
 * FilesystemEntry data into browse/search models but never installs, decodes, or
 * interprets the target Resource payload.
 */
export class FileManagerService {
	private activeSearchRuntime:
		FileManagerSearchRuntimePort | undefined;

	constructor(
		private readonly createSearchRuntime:
			FileManagerSearchRuntimeFactory =
				() => new FileManagerSearchRuntime()
	) {}

	/** Loads and projects mounted roots for the FileManager landing view. */
	async loadRootGroups(
		filesystem: FileManagerFilesystemReader,
		resolveFilesystemPublisherName: (filesystemPublisher: string) => string
	): Promise<readonly FileManagerRootGroup[]> {
		const roots =
			await filesystem.listRoots();

		return this.buildRootGroups(
			roots,
			resolveFilesystemPublisherName
		);
	}

	/** Loads one mounted root and resolves the requested projected directory. */
	async loadDirectory(
		filesystem: FileManagerFilesystemReader,
		filesystemPublisher: string,
		rootPath: string,
		path: string
	): Promise<FileManagerDirectory | undefined> {
		const entries =
			await filesystem.listByRootPath(
				filesystemPublisher,
				rootPath
			);

		return this.findDirectory(
			this.buildTree(
				rootPath,
				entries
			),
			path
		);
	}

	/** Groups mounted roots for the FileManager landing view. */
	buildRootGroups(
		roots: readonly FilesystemRoot[],
		resolveFilesystemPublisherName: (filesystemPublisher: string) => string
	): readonly FileManagerRootGroup[] {
		const rootsByFilesystemPublisher =
			new Map<string, FilesystemRoot[]>();

		for (const root of roots) {
			const filesystemPublisherRoots =
				rootsByFilesystemPublisher.get(root.publisher) ?? [];

			filesystemPublisherRoots.push(root);
			rootsByFilesystemPublisher.set(
				root.publisher,
				filesystemPublisherRoots
			);
		}

		return Array.from(rootsByFilesystemPublisher.entries())
			.map(([filesystemPublisher, filesystemPublisherRoots]) => ({
				filesystemPublisher,
				filesystemPublisherName:
					resolveFilesystemPublisherName(filesystemPublisher),
				roots:
					filesystemPublisherRoots
						.map((root) => ({
							root,
							name: basename(root.rootPath),
							path: root.rootPath
						}))
						.sort(compareRootDisplays)
			}))
			.sort(compareRootGroups);
	}

	/** Projects generic Resource metadata without loading or interpreting content. */
	describeResource(
		entry: FilesystemEntry
	): FileManagerResourceDisplay {
		return createResourceDisplay(entry);
	}

	/** Projects filesystem location context without repeating the Resource filename. */
	describeSearchLocation(
		entry: LocatedFilesystemEntry,
		resolveFilesystemPublisherName: (filesystemPublisher: string) => string
	): FileManagerSearchLocation {
		const parentPath =
			dirname(entry.entry.path);
		const relativeDirectoryPath =
			parentPath !== entry.rootPath &&
			isPathInsideRoot(entry.rootPath, parentPath)
				? parentPath.slice(entry.rootPath.length + 1)
				: '';

		return {
			filesystemRootLabel:
				`${resolveFilesystemPublisherName(entry.filesystemPublisher)} · ${entry.rootPath}`,
			...(relativeDirectoryPath.length > 0
				? { relativeDirectoryPath }
				: {})
		};
	}

	/** Builds stable generic filter options from one FileManager search snapshot. */
	buildSearchOptions(
		entries: readonly LocatedFilesystemEntry[],
		resolvePublisherName: (publisher: string) => string
	): FileManagerSearchOptions {
		const comparePublisherIdsByDisplayName = (
			left: string,
			right: string
		): number =>
			resolvePublisherName(left)
				.localeCompare(
					resolvePublisherName(right),
					undefined,
					{ sensitivity: 'base' }
				);

		return {
			filesystemPublishers: uniqueMetadataValues(
				entries,
				(entry) => entry.filesystemPublisher,
				comparePublisherIdsByDisplayName
			),
			rootPaths:
				this.buildRootPathOptions(
					entries
				),
			resourcePublishers: uniqueMetadataValues(
				entries,
				(entry) => entry.entry.descriptor.metadata.publisher,
				comparePublisherIdsByDisplayName
			),
			dataTypes: uniqueMetadataValues(
				entries,
				(entry) => entry.entry.descriptor.metadata.dataType
			),
			mediaTypes: uniqueMetadataValues(
				entries,
				(entry) => entry.entry.descriptor.metadata.mediaType
			),
			categories: uniqueMetadataValues(
				entries,
				(entry) =>
					entry.entry.descriptor.resourceMetadata?.category ?? ''
			)
		};
	}

	/**
	 * Returns mounted root paths available to the selected filesystem publisher.
	 * An empty publisher keeps the Search root filter global.
	 */
	buildRootPathOptions(
		entries: readonly LocatedFilesystemEntry[],
		filesystemPublisher = ''
	): readonly string[] {
		const scopedEntries =
			filesystemPublisher.length === 0
				? entries
				: entries.filter(
					(entry) =>
						entry.filesystemPublisher === filesystemPublisher
				);

		return uniqueMetadataValues(
			scopedEntries,
			(entry) => entry.rootPath
		);
	}

	/**
	 * Rebuilds the on-demand search runtime from the current filesystem snapshot.
	 *
	 * A superseded initialization resolves to undefined so stale async work cannot
	 * replace a newer runtime owned by this FileManagerService instance.
	 */
	async initializeSearch(
		filesystem: FileManagerFilesystemReader
	): Promise<readonly LocatedFilesystemEntry[] | undefined> {
		this.disposeSearch();

		const searchRuntime =
			this.createSearchRuntime();

		this.activeSearchRuntime = searchRuntime;

		try {
			const entries =
				await this.listLocatedEntries(
					filesystem
				);

			if (this.activeSearchRuntime !== searchRuntime) {
				return undefined;
			}

			await searchRuntime.initialize(entries);

			return this.activeSearchRuntime === searchRuntime
				? entries
				: undefined;
		} catch (error) {
			if (this.activeSearchRuntime !== searchRuntime) {
				return undefined;
			}

			searchRuntime.dispose();
			this.activeSearchRuntime = undefined;
			throw error;
		}
	}

	/**
	 * Searches through the currently initialized metadata runtime.
	 *
	 * Query-level failures leave the runtime active and are returned unchanged.
	 * A terminal Worker/runtime failure clears ownership and is translated into a
	 * FileManager-level unavailable error so the view can rebuild the runtime.
	 */
	search(
		query: FileManagerSearchQuery
	): Promise<readonly LocatedFilesystemEntry[]> {
		const searchRuntime =
			this.activeSearchRuntime;

		if (!searchRuntime) {
			throw new Error(
				'FileManager search has not been initialized.'
			);
		}

		if (!searchRuntime.isActive) {
			this.activeSearchRuntime = undefined;
			throw new FileManagerSearchUnavailableError(
				new Error(
					'FileManager search runtime is no longer active.'
				)
			);
		}

		return searchRuntime.search(query)
			.catch((error: unknown) => {
				if (
					this.activeSearchRuntime === searchRuntime &&
					!searchRuntime.isActive
				) {
					this.activeSearchRuntime = undefined;
					throw new FileManagerSearchUnavailableError(error);
				}

				throw error;
			});
	}

	/** Disposes the ephemeral FileManager search worker/index when no longer used. */
	disposeSearch(): void {
		const searchRuntime =
			this.activeSearchRuntime;

		this.activeSearchRuntime = undefined;
		searchRuntime?.dispose();
	}

	/**
	 * Loads one global FileManager search snapshot while retaining filesystem
	 * root provenance for every persisted entry.
	 */
	async listLocatedEntries(
		filesystem: FileManagerFilesystemReader
	): Promise<readonly LocatedFilesystemEntry[]> {
		const roots =
			await filesystem.listRoots();

		const locatedEntriesByRoot =
			await Promise.all(
				roots.map(
					async (root) => {
						const entries =
							await filesystem.listByRootPath(
								root.publisher,
								root.rootPath
							);

						const tree =
							this.buildTree(
								root.rootPath,
								entries
							);

						return listTreeEntries(
							tree
						).map(
							(entry) => ({
								filesystemPublisher: root.publisher,
								rootPath: root.rootPath,
								entry
							})
						);
					}
				)
			);

		return locatedEntriesByRoot.flat();
	}

	/**
	 * Builds one root tree from entries whose paths include the selected root.
	 *
	 * When one path is both a Resource and the prefix of another Resource path,
	 * directory projection wins. The conflicting file remains persisted but is
	 * ignored by this browse projection and a warning is emitted.
	 */
	buildTree(
		rootPath: string,
		entries:
			readonly FilesystemEntry[]
	): FileManagerDirectory {
		const root = createMutableDirectory(
			basename(rootPath),
			rootPath
		);

		const directoryPaths =
			this.collectDirectoryPaths(
				rootPath,
				entries
			);

		for (const directoryPath of directoryPaths) {
			this.ensureDirectory(
				root,
				rootPath,
				directoryPath
			);
		}

		for (const entry of entries) {
			if (
				!isPathInsideRoot(
					rootPath,
					entry.path
				)
			) {
				console.warn(
					`Ignoring Filesystem entry outside root ${rootPath}: ${entry.path}`
				);
				continue;
			}

			if (
				entry.path === rootPath ||
				directoryPaths.has(entry.path)
			) {
				console.warn(
					`Ignoring Filesystem file shadowed by directory: ${entry.path}`
				);
				continue;
			}

			const parentPath = dirname(entry.path);
			const parent =
				this.ensureDirectory(
					root,
					rootPath,
					parentPath
				);

			const resource =
				createResource(entry);

			parent.resources.set(
				resource.path,
				resource
			);
		}

		return freezeDirectory(root);
	}

	/** Builds root-to-current path segments for optional wide-pane navigation. */
	buildBreadcrumbs(
		rootPath: string,
		path: string
	): readonly FileManagerBreadcrumb[] {
		if (!isPathInsideRoot(rootPath, path)) {
			return [];
		}

		const breadcrumbs: FileManagerBreadcrumb[] = [
			{
				name: basename(rootPath),
				path: rootPath
			}
		];

		if (path === rootPath) {
			return breadcrumbs;
		}

		const relativePath =
			path.slice(
				rootPath.length + 1
			);
		let currentPath = rootPath;

		for (const segment of relativePath.split('/')) {
			currentPath = `${currentPath}/${segment}`;
			breadcrumbs.push({
				name: segment,
				path: currentPath
			});
		}

		return breadcrumbs;
	}

	/** Resolves one projected directory by its full filesystem path. */
	findDirectory(
		root: FileManagerDirectory,
		path: string
	): FileManagerDirectory | undefined {
		if (path === root.path) {
			return root;
		}

		if (!isPathInsideRoot(root.path, path)) {
			return undefined;
		}

		const relativeSegments =
			path.slice(root.path.length + 1)
				.split('/');

		let current = root;

		for (const segment of relativeSegments) {
			const next =
				current.directories.find(
					(directory) =>
						directory.name === segment
				);

			if (!next) {
				return undefined;
			}

			current = next;
		}

		return current;
	}

	/** Collects every synthetic ancestor directory required by valid root entries. */
	private collectDirectoryPaths(
		rootPath: string,
		entries:
			readonly FilesystemEntry[]
	): Set<string> {
		const directories =
			new Set<string>();

		for (const entry of entries) {
			if (
				!isPathInsideRoot(
					rootPath,
					entry.path
				)
			) {
				continue;
			}

			let current = dirname(entry.path);

			while (
				current.length > 0 &&
				current !== rootPath &&
				isPathInsideRoot(
					rootPath,
					current
				)
			) {
				directories.add(current);
				current = dirname(current);
			}
		}

		return directories;
	}

	/** Resolves or creates one synthetic directory along a root-prefixed path. */
	private ensureDirectory(
		root: MutableDirectory,
		rootPath: string,
		path: string
	): MutableDirectory {
		if (path === rootPath) {
			return root;
		}

		if (!isPathInsideRoot(rootPath, path)) {
			throw new Error(
				`FileManager directory is outside root ${rootPath}: ${path}`
			);
		}

		const relativeSegments =
			path.slice(rootPath.length + 1)
				.split('/');

		let current = root;
		let currentPath = rootPath;

		for (const segment of relativeSegments) {
			currentPath = `${currentPath}/${segment}`;

			let child =
				current.directories.get(
					segment
				);

			if (!child) {
				child = createMutableDirectory(
					segment,
					currentPath
				);

				current.directories.set(
					segment,
					child
				);
			}

			current = child;
		}

		return current;
	}
}

/** Flattens only projected Resources, preserving the same shadow rules as Browse. */
function listTreeEntries(
	directory: FileManagerDirectory
): FilesystemEntry[] {
	return [
		...directory.resources.map(
			(resource) => resource.entry
		),
		...directory.directories.flatMap(
			(child) => listTreeEntries(child)
		)
	];
}

/** Creates one mutable construction node before the tree is frozen/sorted. */
function createMutableDirectory(
	name: string,
	path: string
): MutableDirectory {
	return {
		name,
		path,
		directories:
			new Map(),
		resources:
			new Map()
	};
}

/** Converts construction Maps into immutable, name-sorted FileManager arrays. */
function freezeDirectory(
	directory: MutableDirectory
): FileManagerDirectory {
	return {
		kind: 'directory',
		name:
			directory.name,
		path:
			directory.path,
		directories:
			Array.from(
				directory.directories.values()
			)
				.map(freezeDirectory)
				.sort(compareByName),
		resources:
			Array.from(
				directory.resources.values()
			)
				.sort(compareByName)
	};
}

/** Wraps one persisted FilesystemEntry as a FileManager Resource node. */
function createResource(
	entry: FilesystemEntry
): FileManagerResource {
	const display =
		createResourceDisplay(entry);

	return {
		kind: 'resource',
		name:
			display.name,
		path:
			entry.path,
		entry
	};
}

/** Builds generic display metadata without reading the target Resource payload. */
function createResourceDisplay(
	entry: FilesystemEntry
): FileManagerResourceDisplay {
	const metadata =
		entry.descriptor.metadata;
	const displayName =
		metadata.name?.trim();
	const resourceIcon =
		entry.descriptor.resourceMetadata?.icon;
	const dataType =
		metadata.dataType.trim();
	const resourceType =
		metadata.resourceType.trim();
	const mediaType =
		metadata.mediaType.trim();

	return {
		name:
			displayName && displayName.length > 0
				? displayName
				: basename(entry.path),
		metadataLabel:
			dataType && dataType.length > 0
				? dataType
				: resourceType.length > 0
					? resourceType
					: mediaType.length > 0
						? mediaType
						: 'Resource',
		iconID:
			resolveResourceIconID(
				resourceIcon,
				dataType
			)
	};
}

function compareRootDisplays(
	left: FileManagerRootGroup['roots'][number],
	right: FileManagerRootGroup['roots'][number]
): number {
	const byName = compareStrings(
		left.name,
		right.name
	);

	return byName !== 0
		? byName
		: compareStrings(
			left.path,
			right.path
		);
}

function compareRootGroups(
	left: FileManagerRootGroup,
	right: FileManagerRootGroup
): number {
	const byName = compareStrings(
		left.filesystemPublisherName,
		right.filesystemPublisherName
	);

	return byName !== 0
		? byName
		: compareStrings(
			left.filesystemPublisher,
			right.filesystemPublisher
		);
}

function uniqueMetadataValues(
	entries: readonly LocatedFilesystemEntry[],
	readValue: (entry: LocatedFilesystemEntry) => string | undefined,
	compare: (left: string, right: string) => number = compareStrings
): readonly string[] {
	return Array.from(
		new Set(
			entries
				.map(readValue)
				.filter(
					(value): value is string =>
						typeof value === 'string' &&
						value.length > 0
				)
		)
	).sort(compare);
}

function compareStrings(
	left: string,
	right: string
): number {
	return left.localeCompare(
		right,
		undefined,
		{ sensitivity: 'base' }
	);
}

function compareByName(
	left: { readonly name: string },
	right: { readonly name: string }
): number {
	return left.name.localeCompare(
		right.name,
		undefined,
		{
			sensitivity: 'base'
		}
	);
}

/** Segment-safe root containment check; avoids treating `foo2` as inside `foo`. */
function isPathInsideRoot(
	rootPath: string,
	path: string
): boolean {
	return (
		path === rootPath ||
		path.startsWith(`${rootPath}/`)
	);
}

function dirname(
	path: string
): string {
	const index = path.lastIndexOf('/');

	return index === -1
		? ''
		: path.slice(0, index);
}

function basename(
	path: string
): string {
	const index = path.lastIndexOf('/');

	return index === -1
		? path
		: path.slice(index + 1);
}
