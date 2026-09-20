import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	KJVOnlyArchiveExportSelection
} from './kjvonly-archive-export-selection';

import type {
	KJVOnlyArchiveImportResult
} from './kjvonly-archive-importer';

import {
	KJVOnlyArchiveService
} from './kjvonly-archive.service';

interface ArchiveWorkerClient {
	import(
		value: Uint8Array
	): Promise<KJVOnlyArchiveImportResult>;

	export(
		selection:
			KJVOnlyArchiveExportSelection
	): Promise<Uint8Array>;
}

describe(
	'KJVOnlyArchiveService',
	() => {
		it(
			'delegates imports to the archive worker client',
			async () => {
				const value =
					new Uint8Array([
						1,
						2,
						3
					]);

				const result:
					KJVOnlyArchiveImportResult = {
					resources: []
				};

				const workerClient:
					ArchiveWorkerClient = {
					import:
						vi.fn(
							async () =>
								result
						),
					export:
						vi.fn()
				};

				const service =
					new KJVOnlyArchiveService(
						workerClient
					);

				await expect(
					service.import(
						value
					)
				).resolves.toBe(
					result
				);

				expect(
					workerClient.import
				).toHaveBeenCalledWith(
					value
				);
			}
		);


		it(
			'notifies import subscribers with the Resource Types that were actually handled',
			async () => {
				const result:
					KJVOnlyArchiveImportResult = {
						resources: [
							{
								id: 'note:1',
								status: 'handled',
								resourceType: 'kjvonly/notes/entries',
								resourceId: 'kjvonly/notes/entries/default/1'
							},
							{
								id: 'plan:1',
								status: 'handled',
								resourceType: 'kjvonly/plans/progress',
								resourceId: 'kjvonly/plans/progress/default/1'
							},
							{
								id: 'plan:2',
								status: 'current',
								resourceType: 'kjvonly/plans/subscriptions',
								resourceId: 'kjvonly/plans/subscriptions/default/2'
							}
						]
					};

				const workerClient:
					ArchiveWorkerClient = {
						import: vi.fn(
							async () =>
								result
						),
						export: vi.fn()
					};

				const service =
					new KJVOnlyArchiveService(
						workerClient
					);

				const subscriber =
					vi.fn();

				service.subscribeToImports(
					subscriber
				);

				await service.import(
					new Uint8Array([1])
				);

				expect(
					subscriber
				).toHaveBeenCalledTimes(
					1
				);

				const event =
					subscriber.mock.calls[0][0];

				expect(
					event.result
				).toBe(
					result
				);

				expect(
					event.importedResourceTypes
				).toEqual(
					new Set([
						'kjvonly/notes/entries',
						'kjvonly/plans/progress'
					])
				);
			}
		);

		it(
			'keeps import completion independent from subscriber failures',
			async () => {
				const result:
					KJVOnlyArchiveImportResult = {
						resources: []
					};

				const importPromise =
					Promise.resolve(
						result
					);

				const service =
					new KJVOnlyArchiveService({
						import: vi.fn(
							() =>
								importPromise
						),
						export: vi.fn()
					});

				const error =
					new Error(
						'subscriber failed'
					);

				const consoleError =
					vi.spyOn(
						console,
						'error'
					).mockImplementation(
						() => {}
					);

				const laterSubscriber =
					vi.fn();

				service.subscribeToImports(
					() => {
						throw error;
					}
				);

				service.subscribeToImports(
					laterSubscriber
				);

				const returnedPromise =
					service.import(
						new Uint8Array([1])
					);

				expect(
					returnedPromise
				).toBe(
					importPromise
				);

				await expect(
					returnedPromise
				).resolves.toBe(
					result
				);

				expect(
					laterSubscriber
				).toHaveBeenCalledTimes(
					1
				);

				expect(
					consoleError
				).toHaveBeenCalledWith(
					'Archive import subscriber failed.',
					error
				);

				consoleError.mockRestore();
			}
		);

		it(
			'unsubscribes import subscribers',
			async () => {
				const result:
					KJVOnlyArchiveImportResult = {
						resources: []
					};

				const service =
					new KJVOnlyArchiveService({
						import: vi.fn(
							async () =>
								result
						),
						export: vi.fn()
					});

				const subscriber =
					vi.fn();

				const unsubscribe =
					service.subscribeToImports(
						subscriber
					);

				unsubscribe();

				await service.import(
					new Uint8Array([1])
				);

				expect(
					subscriber
				).not.toHaveBeenCalled();
			}
		);
		it(
			'delegates exports to the archive worker client',
			async () => {
				const selection:
					KJVOnlyArchiveExportSelection = {
					types: [
						{
							objectType:
								'notes/note',
							patterns: [
								'default'
							]
						}
					]
				};

				const value =
					new Uint8Array([
						4,
						5,
						6
					]);

				const workerClient:
					ArchiveWorkerClient = {
					import:
						vi.fn(),
					export:
						vi.fn(
							async () =>
								value
						)
				};

				const service =
					new KJVOnlyArchiveService(
						workerClient
					);

				await expect(
					service.export(
						selection
					)
				).resolves.toBe(
					value
				);

				expect(
					workerClient.export
				).toHaveBeenCalledWith(
					selection
				);
			}
		);
	}
);
