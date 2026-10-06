import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	FilesystemEntry
} from '$lib/domains/filesystem';

import {
	FileManagerSearchUnavailableError,
	FileManagerService
} from './file-manager.service';

describe(
	'FileManagerService',
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			'owns search runtime initialization, querying, and disposal',
			async () => {
				const initialize =
					vi.fn()
						.mockResolvedValue(undefined);
				const search =
					vi.fn();
				const dispose =
					vi.fn();
				const runtime = {
					isActive: true,
					initialize,
					search,
					dispose
				};
				const service =
					new FileManagerService(
						() => runtime
					);
				const filesystem = {
					listRoots: async () => [
						{ publisher: 'alice', rootPath: 'library' }
					],
					listByRootPath: async () => [
						createEntry('library/grace')
					]
				};

				const entries =
					await service.initializeSearch(
						filesystem
					);

				expect(entries).toEqual([
					{
						filesystemPublisher: 'alice',
						rootPath: 'library',
						entry: createEntry('library/grace')
					}
				]);
				expect(initialize)
					.toHaveBeenCalledWith(entries);

				search.mockResolvedValue(entries);

				await expect(
					service.search({ text: 'grace' })
				).resolves.toEqual(entries);
				expect(search)
					.toHaveBeenCalledWith({ text: 'grace' });

				service.disposeSearch();

				expect(dispose)
					.toHaveBeenCalledOnce();
				expect(
					() => service.search({ text: '' })
				).toThrow(
					'FileManager search has not been initialized.'
				);
			}
		);

		it(
			'keeps an active search runtime after a query-level failure',
			async () => {
				const queryError =
					new Error('Query failed.');
				const search =
					vi.fn()
						.mockRejectedValueOnce(queryError)
						.mockResolvedValueOnce([]);
				const runtime = {
					isActive: true,
					initialize: vi.fn().mockResolvedValue(undefined),
					search,
					dispose: vi.fn()
				};
				const service =
					new FileManagerService(
						() => runtime
					);
				const filesystem = {
					listRoots: async () => [],
					listByRootPath: async () => []
				};

				await service.initializeSearch(filesystem);

				await expect(
					service.search({ text: 'grace' })
				).rejects.toBe(queryError);
				await expect(
					service.search({ text: 'faith' })
				).resolves.toEqual([]);
				expect(runtime.dispose).not.toHaveBeenCalled();
			}
		);

		it(
			'disposes and clears a search runtime when initialization fails',
			async () => {
				const initializationError =
					new Error('Initialization failed.');
				const dispose =
					vi.fn();
				const runtime = {
					isActive: true,
					initialize: vi.fn()
						.mockRejectedValue(initializationError),
					search: vi.fn(),
					dispose
				};
				const service =
					new FileManagerService(
						() => runtime
					);
				const filesystem = {
					listRoots: async () => [],
					listByRootPath: async () => []
				};

				await expect(
					service.initializeSearch(filesystem)
				).rejects.toBe(initializationError);
				expect(dispose).toHaveBeenCalledOnce();
				expect(
					() => service.search({ text: '' })
				).toThrow(
					'FileManager search has not been initialized.'
				);
			}
		);

		it(
			'clears a terminally failed search runtime so it can be rebuilt',
			async () => {
				let runtimeIsActive = true;
				const workerError =
					new Error('Worker crashed.');
				const runtime = {
					get isActive() {
						return runtimeIsActive;
					},
					initialize: vi.fn().mockResolvedValue(undefined),
					search: vi.fn().mockImplementation(async () => {
						runtimeIsActive = false;
						throw workerError;
					}),
					dispose: vi.fn()
				};
				const service =
					new FileManagerService(
						() => runtime
					);
				const filesystem = {
					listRoots: async () => [],
					listByRootPath: async () => []
				};

				await service.initializeSearch(filesystem);

				const terminalSearch =
					service.search({ text: 'grace' });

				await expect(terminalSearch)
					.rejects.toBeInstanceOf(
						FileManagerSearchUnavailableError
					);
				await expect(terminalSearch)
					.rejects.toMatchObject({
						cause: workerError
					});

				expect(
					() => service.search({ text: 'faith' })
				).toThrow(
					'FileManager search has not been initialized.'
				);
				expect(runtime.dispose).not.toHaveBeenCalled();
			}
		);

		it(
			'detects a search runtime that failed while idle',
			async () => {
				let runtimeIsActive = true;
				const search = vi.fn();
				const runtime = {
					get isActive() {
						return runtimeIsActive;
					},
					initialize: vi.fn().mockResolvedValue(undefined),
					search,
					dispose: vi.fn()
				};
				const service =
					new FileManagerService(
						() => runtime
					);
				const filesystem = {
					listRoots: async () => [],
					listByRootPath: async () => []
				};

				await service.initializeSearch(filesystem);
				runtimeIsActive = false;

				expect(
					() => service.search({ text: 'grace' })
				).toThrow(FileManagerSearchUnavailableError);
				expect(search).not.toHaveBeenCalled();
				expect(
					() => service.search({ text: 'faith' })
				).toThrow(
					'FileManager search has not been initialized.'
				);
			}
		);

		it(
			'loads mounted roots before projecting landing presentation',
			async () => {
				const service =
					new FileManagerService();
				const listRoots = vi.fn()
					.mockResolvedValue([
						{ publisher: 'publisher', rootPath: 'library/books' }
					]);

				await expect(
					service.loadRootGroups(
						{
							listRoots,
							listByRootPath: vi.fn()
						},
						() => 'Publisher'
					)
				).resolves.toEqual([
					{
						filesystemPublisher: 'publisher',
						filesystemPublisherName: 'Publisher',
						roots: [
							{
								root: { publisher: 'publisher', rootPath: 'library/books' },
								name: 'books',
								path: 'library/books'
							}
						]
					}
				]);
				expect(listRoots)
					.toHaveBeenCalledOnce();
			}
		);

		it(
			'groups and sorts mounted roots for landing presentation',
			() => {
				const service =
					new FileManagerService();

				const groups =
					service.buildRootGroups(
						[
							{ publisher: 'publisher-b', rootPath: 'shared/books' },
							{ publisher: 'publisher-a', rootPath: 'sermons' },
							{ publisher: 'publisher-b', rootPath: 'archive/books' },
							{ publisher: 'publisher-b', rootPath: 'audio' }
						],
						(publisher) =>
							publisher === 'publisher-b'
								? 'Alice'
								: 'Bob'
					);

				expect(groups).toEqual([
					{
						filesystemPublisher: 'publisher-b',
						filesystemPublisherName: 'Alice',
						roots: [
							{
								root: { publisher: 'publisher-b', rootPath: 'audio' },
								name: 'audio',
								path: 'audio'
							},
							{
								root: { publisher: 'publisher-b', rootPath: 'archive/books' },
								name: 'books',
								path: 'archive/books'
							},
							{
								root: { publisher: 'publisher-b', rootPath: 'shared/books' },
								name: 'books',
								path: 'shared/books'
							}
						]
					},
					{
						filesystemPublisher: 'publisher-a',
						filesystemPublisherName: 'Bob',
						roots: [
							{
								root: { publisher: 'publisher-a', rootPath: 'sermons' },
								name: 'sermons',
								path: 'sermons'
							}
						]
					}
				]);
			}
		);

		it(
			'prefers optional Resource icon metadata with generic fallback',
			() => {
				const service =
					new FileManagerService();

				expect(
					service.describeResource(
						createEntry(
							'library/grace',
							'  Grace Alone  ',
							'resource-publisher',
							'article'
						)
					)
				).toEqual({
					name: 'Grace Alone',
					metadataLabel: 'kjvonly.normalized-document',
					iconID: 'article'
				});

				expect(
					service.describeResource(
						createEntry('library/faith')
					)
				).toEqual({
					name: 'faith',
					metadataLabel: 'kjvonly.normalized-document',
					iconID: 'document'
				});
			}
		);

		it(
			'projects Search location context without repeating the Resource filename',
			() => {
				const service =
					new FileManagerService();

				expect(
					service.describeSearchLocation(
						{
							filesystemPublisher: 'alice',
							rootPath: 'library',
							entry: createEntry('library/books/theology/grace')
						},
						() => 'Alice'
					)
				).toEqual({
					filesystemRootLabel: 'Alice · library',
					relativeDirectoryPath: 'books/theology'
				});

				expect(
					service.describeSearchLocation(
						{
							filesystemPublisher: 'alice',
							rootPath: 'library',
							entry: createEntry('library/grace')
						},
						() => 'Alice'
					)
				).toEqual({
					filesystemRootLabel: 'Alice · library'
				});
			}
		);

		it(
			'builds stable search filter options from generic metadata',
			() => {
				const service =
					new FileManagerService();
				const alice = createEntry(
					'library/alice',
					undefined,
					'z-resource'
				);
				const bob = createEntry(
					'library/bob',
					undefined,
					'a-resource'
				);

				const options =
					service.buildSearchOptions(
						[
							{
								filesystemPublisher: 'z-filesystem',
								rootPath: 'sermons',
								entry: alice
							},
							{
								filesystemPublisher: 'a-filesystem',
								rootPath: 'library',
								entry: bob
							},
							{
								filesystemPublisher: 'z-filesystem',
								rootPath: 'sermons',
								entry: alice
							}
						],
						(publisher) => ({
							'z-filesystem': 'Alice',
							'a-filesystem': 'Bob',
							'z-resource': 'Charlie',
							'a-resource': 'David'
						}[publisher] ?? publisher)
					);

				expect(options).toEqual({
					filesystemPublishers: ['z-filesystem', 'a-filesystem'],
					rootPaths: ['library', 'sermons'],
					resourcePublishers: ['z-resource', 'a-resource'],
					dataTypes: ['kjvonly.normalized-document'],
					mediaTypes: ['application/json'],
					categories: ['documents']
				});
			}
		);

		it(
			'loads and resolves one projected browser directory',
			async () => {
				const service =
					new FileManagerService();
				const listByRootPath = vi.fn()
					.mockResolvedValue([
						createEntry('library/books/grace'),
						createEntry('library/audio/hymn')
					]);

				const directory =
					await service.loadDirectory(
						{
							listRoots: vi.fn(),
							listByRootPath
						},
						'publisher',
						'library',
						'library/books'
					);

				expect(listByRootPath)
					.toHaveBeenCalledWith(
						'publisher',
						'library'
					);
				expect(directory?.path)
					.toBe('library/books');
				expect(
					directory?.resources.map(
						(resource) => resource.path
					)
				).toEqual([
					'library/books/grace'
				]);
			}
		);

		it(
			'loads searchable entries across roots while preserving filesystem provenance',
			async () => {
				const service =
					new FileManagerService();

				const filesystem = {
					listRoots: vi.fn()
						.mockResolvedValue([
							{ publisher: 'alice', rootPath: 'sermons' },
							{ publisher: 'bob', rootPath: 'library' }
						]),
					listByRootPath: vi.fn(
						async (
							publisher: string,
							rootPath: string
						) => {
							if (publisher === 'alice') {
								return [
									createEntry(`${rootPath}/spurgeon/grace`)
								];
							}

							return [
								createEntry(`${rootPath}/books/faith`)
							];
						}
					)
				};

				const entries =
					await service.listLocatedEntries(
						filesystem
					);

				expect(entries).toEqual([
					{
						filesystemPublisher: 'alice',
						rootPath: 'sermons',
						entry: createEntry('sermons/spurgeon/grace')
					},
					{
						filesystemPublisher: 'bob',
						rootPath: 'library',
						entry: createEntry('library/books/faith')
					}
				]);
			}
		);

		it(
			'excludes a file shadowed by a projected directory from the search snapshot',
			async () => {
				vi.spyOn(
					console,
					'warn'
				).mockImplementation(
					() => undefined
				);

				const service =
					new FileManagerService();

				const entries =
					await service.listLocatedEntries({
						listRoots: async () => [
							{ publisher: 'alice', rootPath: 'library' }
						],
						listByRootPath: async () => [
							createEntry('library/foo'),
							createEntry('library/foo/bar')
						]
					});

				expect(
					entries.map(
						(located) => located.entry.path
					)
				).toEqual([
					'library/foo/bar'
				]);
			}
		);

		it(
			'builds a sorted directory tree from root-prefixed filesystem paths',
			() => {
				const service =
					new FileManagerService();

				const tree = service.buildTree(
					'library',
					[
						createEntry(
							'library/spurgeon/grace'
						),
						createEntry(
							'library/articles/faith'
						),
						createEntry(
							'library/spurgeon/election',
							'Election Sermon'
						)
					]
				);

				expect(
					tree.path
				).toBe('library');

				expect(
					tree.directories.map(
						(directory) => directory.name
					)
				).toEqual([
					'articles',
					'spurgeon'
				]);

				const spurgeon =
					service.findDirectory(
						tree,
						'library/spurgeon'
					);

				expect(spurgeon).toBeDefined();
				expect(
					spurgeon?.resources.map(
						(resource) => ({
							name: resource.name,
							path: resource.path
						})
					)
				).toEqual([
					{
						name: 'Election Sermon',
						path: 'library/spurgeon/election'
					},
					{
						name: 'grace',
						path: 'library/spurgeon/grace'
					}
				]);
			}
		);

		it(
			'lets a projected directory shadow a conflicting file path',
			() => {
				const warn =
					vi.spyOn(
						console,
						'warn'
					)
						.mockImplementation(
							() => undefined
						);

				const service =
					new FileManagerService();

				const tree = service.buildTree(
					'library',
					[
						createEntry(
							'library/foo'
						),
						createEntry(
							'library/foo/bar'
						)
					]
				);

				expect(
					tree.resources
				).toEqual([]);
				expect(
					tree.directories.map(
						(directory) => directory.path
					)
				).toEqual([
					'library/foo'
				]);
				expect(
					tree.directories[0].resources.map(
						(resource) => resource.path
					)
				).toEqual([
					'library/foo/bar'
				]);
				expect(warn).toHaveBeenCalledWith(
					'Ignoring Filesystem file shadowed by directory: library/foo'
				);
			}
		);

		it(
			'ignores and warns about entries outside the selected root',
			() => {
				const warn =
					vi.spyOn(
						console,
						'warn'
					)
						.mockImplementation(
							() => undefined
						);

				const service =
					new FileManagerService();

				const tree = service.buildTree(
					'library',
					[
						createEntry(
							'other/foo'
						)
					]
				);

				expect(tree.directories).toEqual([]);
				expect(tree.resources).toEqual([]);
				expect(warn).toHaveBeenCalledWith(
					'Ignoring Filesystem entry outside root library: other/foo'
				);
			}
		);

		it(
			'builds root-to-current breadcrumbs for a browser path',
			() => {
				const service =
					new FileManagerService();

				expect(
					service.buildBreadcrumbs(
						'library',
						'library/sermons/spurgeon'
					)
				).toEqual([
					{ name: 'library', path: 'library' },
					{ name: 'sermons', path: 'library/sermons' },
					{ name: 'spurgeon', path: 'library/sermons/spurgeon' }
				]);
			}
		);

		it(
			'rejects breadcrumbs outside the selected root',
			() => {
				const service =
					new FileManagerService();

				expect(
					service.buildBreadcrumbs(
						'library',
						'other/sermons'
					)
				).toEqual([]);
			}
		);

		it(
			'resolves only directories beneath the projected root',
			() => {
				const service =
					new FileManagerService();

				const tree = service.buildTree(
					'library',
					[
						createEntry(
							'library/foo/bar/baz'
						)
					]
				);

				expect(
					service.findDirectory(
						tree,
						'library/foo/bar'
					)?.path
				).toBe('library/foo/bar');

				expect(
					service.findDirectory(
						tree,
						'other/foo'
					)
				).toBeUndefined();
			}
		);
	}
);

function createEntry(
	path: string,
	name?: string,
	publisher = 'resource-publisher',
	icon?: string
): FilesystemEntry {
	return {
		path,
		descriptor: {
			resourceMetadata: {
				category: 'documents',
				...(icon ? { icon } : {})
			},
			metadata: {
				publisher,
				resourceId: `resource/${path}`,
				...(name ? { name } : {}),
				resourceType: 'normalized-content/document',
				dataType: 'kjvonly.normalized-document',
				dataVersion: 1,
				modifiedAt: 1,
				representation: 'content',
				mediaType: 'application/json'
			},
			strategy: {
				type: 'test',
				data: null
			}
		}
	};
}
