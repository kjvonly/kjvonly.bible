import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	ResourceDescriptor
} from '$lib/resource';

import {
	Modules
} from '../../../models/modules.model';

import {
	FILE_MANAGER_VIEWS
} from '../models/file-manager-navigation.model';

import {
	FileManagerNavigationService
} from './file-manager-navigation.service';

describe(
	'FileManagerNavigationService',
	() => {
		it(
			'opens a filesystem root as browser semantic state',
			() => {
				const pushView = vi.fn();
				const service =
					new FileManagerNavigationService(
						{
							pushView,
							pushModule: vi.fn(),
							back: vi.fn()
						},
						{
							resolve: vi.fn()
						},
						{
							showToast: vi.fn()
						}
					);

				service.openRoot({
					publisher: 'alice',
					rootPath: 'library'
				});

				expect(pushView).toHaveBeenCalledWith(
					FILE_MANAGER_VIEWS.BROWSER,
					{
						publisher: 'alice',
						rootPath: 'library',
						path: 'library',
						viewMode: 'list'
					}
				);
			}
		);

		it(
			'opens the FileManager overflow action view',
			() => {
				const pushView = vi.fn();
				const service =
					new FileManagerNavigationService(
						{
							pushView,
							pushModule: vi.fn(),
							back: vi.fn()
						},
						{
							resolve: vi.fn()
						},
						{
							showToast: vi.fn()
						}
					);

				service.openOverflowActions();

				expect(pushView).toHaveBeenCalledWith(
					FILE_MANAGER_VIEWS.OVERFLOW_ACTIONS,
					{}
				);
			}
		);

		it(
			'opens global search with serializable FileManager state',
			() => {
				const pushView = vi.fn();
				const service =
					new FileManagerNavigationService(
						{
							pushView,
							pushModule: vi.fn(),
							back: vi.fn()
						},
						{
							resolve: vi.fn()
						},
						{
							showToast: vi.fn()
						}
					);

				service.openSearch('grid');

				expect(pushView).toHaveBeenCalledWith(
					FILE_MANAGER_VIEWS.SEARCH,
					{
						query: '',
						publisher: '',
						rootPath: '',
						resourcePublisher: '',
						category: '',
						dataType: '',
						mediaType: '',
						fileType: 'all',
						viewMode: 'grid'
					}
				);
			}
		);

		it(
			'preserves root identity while opening a child directory',
			() => {
				const pushView = vi.fn();
				const service =
					new FileManagerNavigationService(
						{
							pushView,
							pushModule: vi.fn(),
							back: vi.fn()
						},
						{
							resolve: vi.fn()
						},
						{
							showToast: vi.fn()
						}
					);

				service.openDirectory(
					'alice',
					'library',
					'library/sermons',
					'grid'
				);

				expect(pushView).toHaveBeenCalledWith(
					FILE_MANAGER_VIEWS.BROWSER,
					{
						publisher: 'alice',
						rootPath: 'library',
						path: 'library/sermons',
						viewMode: 'grid'
					}
				);
			}
		);

		it(
			'pops back to an existing ancestor directory instead of pushing it again',
			() => {
				const back = vi.fn();
				const pushView = vi.fn();
				const service =
					new FileManagerNavigationService(
						{
							pushView,
							pushModule: vi.fn(),
							back
						},
						{
							resolve: vi.fn()
						},
						{
							showToast: vi.fn()
						}
					);

				service.backToAncestorDirectory(
					'library/sermons/spurgeon/romans',
					'library/sermons'
				);

				expect(back).toHaveBeenCalledTimes(2);
				expect(pushView).not.toHaveBeenCalled();
			}
		);

		it(
			'does not navigate when the breadcrumb is already current',
			() => {
				const back = vi.fn();
				const service =
					new FileManagerNavigationService(
						{
							pushView: vi.fn(),
							pushModule: vi.fn(),
							back
						},
						{
							resolve: vi.fn()
						},
						{
							showToast: vi.fn()
						}
					);

				service.backToAncestorDirectory(
					'library/sermons',
					'library/sermons'
				);

				expect(back).not.toHaveBeenCalled();
			}
		);

		it(
			'rejects breadcrumb navigation to a non-ancestor path',
			() => {
				const back = vi.fn();
				const service =
					new FileManagerNavigationService(
						{
							pushView: vi.fn(),
							pushModule: vi.fn(),
							back
						},
						{
							resolve: vi.fn()
						},
						{
							showToast: vi.fn()
						}
					);

				expect(
					() => service.backToAncestorDirectory(
						'library/sermons/spurgeon',
						'library/books'
					)
				).toThrow(
					'FileManager breadcrumb target is not an ancestor: library/books'
				);
				expect(back).not.toHaveBeenCalled();
			}
		);

		it(
			'resolves a ResourceDescriptor and pushes the resolved Module destination',
			() => {
				const descriptor =
					createDescriptor();
				const pushModule = vi.fn();
				const resolve = vi.fn(
					() => ({
						module: Modules.NOTES,
						view: 'notes.root',
						state: {
							noteID: 'note-1'
						}
					})
				);
				const service =
					new FileManagerNavigationService(
						{
							pushView: vi.fn(),
							pushModule,
							back: vi.fn()
						},
						{ resolve },
						{
							showToast: vi.fn()
						}
					);

				service.openResource(
					descriptor
				);

				expect(resolve)
					.toHaveBeenCalledWith(
						descriptor
					);
				expect(pushModule)
					.toHaveBeenCalledWith(
						Modules.NOTES,
						'notes.root',
						{
							noteID: 'note-1'
						}
					);
			}
		);

		it(
			'shows the shared unsupported-file toast when Resource resolution fails',
			() => {
				const descriptor =
					createDescriptor();
				const pushModule = vi.fn();
				const showToast = vi.fn();
				const error =
					new Error('unsupported');
				const consoleError =
					vi.spyOn(console, 'error')
						.mockImplementation(() => undefined);
				const service =
					new FileManagerNavigationService(
						{
							pushView: vi.fn(),
							pushModule,
							back: vi.fn()
						},
						{
							resolve: vi.fn(() => {
								throw error;
							})
						},
						{ showToast }
					);

				service.openResource(
					descriptor
				);

				expect(pushModule)
					.not.toHaveBeenCalled();
				expect(showToast)
					.toHaveBeenCalledWith(
						'No application is available to open this file.'
					);
				expect(consoleError)
					.toHaveBeenCalledWith(
						'FileManager Resource resolution failed.',
						error
					);

				consoleError.mockRestore();
			}
		);

		it(
			'reports pane navigation failure separately from unsupported Resource resolution',
			() => {
				const descriptor =
					createDescriptor();
				const navigationError =
					new Error('navigation failed');
				const pushModule = vi.fn(() => {
					throw navigationError;
				});
				const showToast = vi.fn();
				const resolve = vi.fn(
					() => ({
						module: Modules.NOTES,
						view: 'notes.root',
						state: {
							noteID: 'note-1'
						}
					})
				);
				const consoleError =
					vi.spyOn(console, 'error')
						.mockImplementation(() => undefined);
				const service =
					new FileManagerNavigationService(
						{
							pushView: vi.fn(),
							pushModule,
							back: vi.fn()
						},
						{ resolve },
						{ showToast }
					);

				service.openResource(
					descriptor
				);

				expect(resolve)
					.toHaveBeenCalledWith(
						descriptor
					);
				expect(pushModule)
					.toHaveBeenCalledWith(
						Modules.NOTES,
						'notes.root',
						{
							noteID: 'note-1'
						}
					);
				expect(showToast)
					.toHaveBeenCalledWith(
						'Unable to open this file.'
					);
				expect(showToast)
					.not.toHaveBeenCalledWith(
						'No application is available to open this file.'
					);
				expect(consoleError)
					.toHaveBeenCalledWith(
						'FileManager Resource navigation failed.',
						navigationError
					);

				consoleError.mockRestore();
			}
		);

	}
);

function createDescriptor(): ResourceDescriptor {
	return {
		metadata: {
			publisher: 'publisher',
			resourceId: 'notes/note-1',
			resourceType: 'notes/note',
			dataType: 'kjvonly.note',
			dataVersion: 1,
			modifiedAt: 1,
			representation: 'content',
			mediaType: 'application/json'
		},
		strategy: {
			type: 'test',
			data: null
		}
	};
}
