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
