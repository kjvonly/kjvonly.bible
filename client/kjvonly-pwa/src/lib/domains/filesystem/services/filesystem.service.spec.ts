import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	FilesystemEntry
} from '../models/filesystem-entry';

import type {
	FilesystemStore
} from '../persistence/filesystem-store';

import {
	FilesystemService
} from './filesystem.service';

describe(
	'FilesystemService',
	() => {
		it(
			'gets one mounted entry by filesystem identity',
			async () => {
				const entry =
					createEntry();

				const get =
					vi.fn()
						.mockResolvedValue(
							entry
						);

				const service =
					createService({
						get
					});

				await expect(
					service.get(
						'alice',
						'notes',
						'the-fall/creation'
					)
				).resolves.toBe(
					entry
				);

				expect(
					get
				).toHaveBeenCalledWith(
					'alice',
					'notes',
					'the-fall/creation'
				);
			}
		);

		it(
			'lists mounted entries under one filesystem root',
			async () => {
				const entries = [
					createEntry()
				];

				const listByRootPath =
					vi.fn()
						.mockResolvedValue(
							entries
						);

				const service =
					createService({
						listByRootPath
					});

				await expect(
					service.listByRootPath(
						'alice',
						'notes'
					)
				).resolves.toBe(
					entries
				);

				expect(
					listByRootPath
				).toHaveBeenCalledWith(
					'alice',
					'notes'
				);
			}
		);

		it(
			'searches mounted Resource metadata through the filesystem search boundary',
			async () => {
				const matches = [];

				const search =
					vi.fn()
						.mockResolvedValue(
							matches
						);

				const service =
					new FilesystemService(
						createStore(),
						{ search }
					);

				await expect(
					service.search(
						{
							index: 'dataType',
							value:
								'kjvonly.note/v1'
						},
						'grace'
					)
				).resolves.toBe(
					matches
				);

				expect(
					search
				).toHaveBeenCalledWith(
					{
						index: 'dataType',
						value:
							'kjvonly.note/v1'
					},
					'grace'
				);
			}
		);
	}
);

function createService(
	overrides:
		Partial<FilesystemStore>
): FilesystemService {
	return new FilesystemService(
		createStore(
			overrides
		),
		{
			search:
				vi.fn()
		}
	);
}

function createStore(
	overrides:
		Partial<FilesystemStore> = {}
): Pick<
	FilesystemStore,
	'get' |
		'listByRootPath'
> {
	return {
		get:
			vi.fn(),
		listByRootPath:
			vi.fn(),
		...overrides
	};
}

function createEntry():
	FilesystemEntry {
	return {
		path:
			'the-fall/creation',
		descriptor: {
			metadata: {
				publisher:
					'b'.repeat(
						64
					),
				resourceId:
					'notes/creation',
				name:
					'Creation Note',
				category:
					'notes',
				dataType:
					'kjvonly.note/v1',
				modifiedAt:
					100,
				representation:
					'content',
				mediaType:
					'application/json'
			},
			strategy: {
				type:
					'example',
				data: {
					id:
						'note-content'
				}
			}
		}
	};
}
