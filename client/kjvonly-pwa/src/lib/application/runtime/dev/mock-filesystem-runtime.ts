import type {
	FilesystemEntry,
	FilesystemRoot,
	FilesystemSearchByIndex,
	FilesystemSearchMatch
} from '$lib/domains/filesystem';

import type {
	ResourceDescriptor
} from '$lib/resource';

interface MockFilesystemRootData {
	readonly root: FilesystemRoot;
	readonly entries: readonly FilesystemEntry[];
}

/**
 * In-memory filesystem runtime used only when explicitly selected by the
 * application composition root.
 *
 * It implements the same read/search seams consumed by FilesystemService, so
 * FileManager and every other FilesystemService consumer remain unaware that
 * the backing runtime is mocked.
 */
export class MockFilesystemRuntime {
	private readonly roots:
		readonly MockFilesystemRootData[] =
		createMockFilesystemRoots();

	async listRoots(): Promise<readonly FilesystemRoot[]> {
		return this.roots.map(
			({ root }) => root
		);
	}

	async get(
		publisher: string,
		rootPath: string,
		path: string
	): Promise<FilesystemEntry | undefined> {
		return this.findRoot(
			publisher,
			rootPath
		)?.entries.find(
			(entry) => entry.path === path
		);
	}

	async listByRootPath(
		publisher: string,
		rootPath: string
	): Promise<readonly FilesystemEntry[]> {
		return this.findRoot(
			publisher,
			rootPath
		)?.entries ?? [];
	}

	async search(
		byIndex: FilesystemSearchByIndex,
		text: string
	): Promise<readonly FilesystemSearchMatch[]> {
		const normalizedText =
			text.trim().toLocaleLowerCase();

		return this.roots.flatMap(
			({ root, entries }) =>
				entries
					.filter(
						(entry) =>
							entry.descriptor.metadata[byIndex.index] ===
								byIndex.value &&
							matchesText(
								entry,
								normalizedText
							)
					)
					.map(
						(entry) => ({
							publisher: root.publisher,
							rootPath: root.rootPath,
							entry
						})
					)
		);
	}

	private findRoot(
		publisher: string,
		rootPath: string
	): MockFilesystemRootData | undefined {
		return this.roots.find(
			({ root }) =>
				root.publisher === publisher &&
				root.rootPath === rootPath
		);
	}
}

function matchesText(
	entry: FilesystemEntry,
	normalizedText: string
): boolean {
	if (normalizedText.length === 0) {
		return true;
	}

	const name =
		entry.descriptor.metadata.name ?? '';

	return (
		name.toLocaleLowerCase().includes(normalizedText) ||
		entry.path.toLocaleLowerCase().includes(normalizedText)
	);
}

function createMockFilesystemRoots(): readonly MockFilesystemRootData[] {
	return [
		{
			root: {
				publisher: 'Demo Library',
				rootPath: 'library'
			},
			entries: [
				entry('library/books/theology/knowing-god', {
					name: 'Knowing God',
					publisher: 'Community Author',
					resourceType: 'normalized-content/document',
					category: 'books',
					icon: 'book',
					dataType: 'kjvonly.normalized-document',
					mediaType: 'application/json'
				}),
				entry('library/books/devotional/morning-and-evening', {
					name: 'Morning and Evening',
					publisher: 'Spurgeon Archive',
					resourceType: 'normalized-content/document',
					category: 'books',
					icon: 'book',
					dataType: 'kjvonly.normalized-document',
					mediaType: 'application/json'
				}),
				entry('library/sermons/spurgeon/faiths-checkbook', {
					name: "Faith's Checkbook",
					publisher: 'Spurgeon Archive',
					resourceType: 'normalized-content/document',
					category: 'sermons',
					icon: 'article',
					dataType: 'kjvonly.normalized-document',
					mediaType: 'application/json'
				}),
				entry('library/sermons/sunday/romans-8', {
					name: 'Life in the Spirit — Romans 8',
					publisher: 'Grace Church',
					resourceType: 'normalized-content/document',
					category: 'sermons',
					icon: 'article',
					dataType: 'kjvonly.normalized-document',
					mediaType: 'application/json'
				}),
				entry('library/articles/grace-and-truth', {
					name: 'Grace and Truth',
					publisher: 'Community Author',
					resourceType: 'normalized-content/document',
					category: 'articles',
					icon: 'article',
					dataType: 'kjvonly.normalized-document',
					mediaType: 'text/html'
				}),
				entry('library/posts/community/grace-today', {
					name: 'Grace for Today',
					publisher: 'Community Author',
					resourceType: 'normalized-content/document',
					category: 'community',
					icon: 'post',
					dataType: 'kjvonly.normalized-document',
					mediaType: 'application/json'
				}),
				entry('library/commentary/romans/8', {
					name: 'Romans 8 Commentary',
					publisher: 'KJVOnly',
					resourceType: 'normalized-content/document',
					category: 'commentary',
					icon: 'article',
					dataType: 'kjvonly.normalized-document',
					mediaType: 'application/json'
				})
			]
		},
		{
			root: {
				publisher: 'Demo Library',
				rootPath: 'media'
			},
			entries: [
				entry('media/audio/sermons/romans-8', {
					name: 'Romans 8 — Audio Sermon',
					publisher: 'Grace Church',
					resourceType: 'mock/audio',
					category: 'audio',
					dataType: 'kjvonly.audio',
					mediaType: 'audio/mpeg'
				}),
				entry('media/audio/hymns/amazing-grace', {
					name: 'Amazing Grace',
					publisher: 'KJVOnly',
					resourceType: 'mock/audio',
					category: 'audio',
					dataType: 'kjvonly.audio',
					mediaType: 'audio/mpeg'
				}),
				entry('media/video/sermons/sunday-service', {
					name: 'Sunday Service',
					publisher: 'Grace Church',
					resourceType: 'mock/video',
					category: 'video',
					dataType: 'kjvonly.video',
					mediaType: 'video/mp4'
				}),
				entry('media/images/covers/spurgeon', {
					name: 'Spurgeon Sermons Cover',
					publisher: 'Spurgeon Archive',
					resourceType: 'mock/image',
					category: 'images',
					dataType: 'kjvonly.image',
					mediaType: 'image/jpeg'
				})
			]
		},
		{
			root: {
				publisher: 'Grace Church',
				rootPath: 'shared'
			},
			entries: [
				entry('shared/notes/romans-8', {
					name: 'Romans 8 Study Notes',
					publisher: 'Community Author',
					resourceType: 'notes/note',
					category: 'notes',
					icon: 'notes',
					dataType: 'kjvonly.note',
					mediaType: 'application/json'
				}),
				entry('shared/books/pilgrims-progress', {
					name: "The Pilgrim's Progress",
					publisher: 'Community Author',
					resourceType: 'normalized-content/document',
					category: 'books',
					icon: 'book',
					dataType: 'kjvonly.normalized-document',
					mediaType: 'application/json'
				}),
				entry('shared/articles/reformation', {
					name: 'A Short History of the Reformation',
					publisher: 'KJVOnly',
					resourceType: 'normalized-content/document',
					category: 'articles',
					icon: 'article',
					dataType: 'kjvonly.normalized-document',
					mediaType: 'text/html'
				})
			]
		}
	];
}

function entry(
	path: string,
	metadata: {
		readonly name: string;
		readonly publisher: string;
		readonly resourceType: string;
		readonly category?: string;
		readonly icon?: string;
		readonly dataType: string;
		readonly dataVersion?: number;
		readonly mediaType: string;
	}
): FilesystemEntry {
	const resourceMetadata: Record<string, string> = {};

	if (metadata.category) {
		resourceMetadata.category = metadata.category;
	}

	if (metadata.icon) {
		resourceMetadata.icon = metadata.icon;
	}

	const descriptor: ResourceDescriptor = {
		...(Object.keys(resourceMetadata).length > 0
			? { resourceMetadata }
			: {}),
		metadata: {
			publisher: metadata.publisher,
			resourceId: `mock/${path}`,
			name: metadata.name,
			resourceType: metadata.resourceType,
			dataType: metadata.dataType,
			dataVersion: metadata.dataVersion ?? 1,
			modifiedAt: 1_760_000_000,
			representation: 'content',
			mediaType: metadata.mediaType
		},
		strategy: {
			type: 'mock',
			data: {}
		}
	};

	return {
		path,
		descriptor
	};
}
