import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	StoredFilesystemEntry
} from '$lib/infrastructure/persistence/application.db';

import {
	createFilesystemSearchMatches
} from './filesystem-search-result';

describe(
	'createFilesystemSearchMatches',
	() => {
		it(
			'matches descriptor display names case-insensitively and preserves source location',
			() => {
				const row =
					createRow({
						publisher: 'alice',
						rootPath: 'notes',
						path: 'studies/grace',
						name: 'Grace Study'
					});

				expect(
					createFilesystemSearchMatches(
						[row],
						'GRACE'
					)
				).toEqual([
					{
						publisher: 'alice',
						rootPath: 'notes',
						entry: row.value
					}
				]);
			}
		);

		it(
			'matches normalized filesystem paths when a display name is absent',
			() => {
				const row =
					createRow({
						path: 'spurgeon/morning-and-evening'
					});

				expect(
					createFilesystemSearchMatches(
						[row],
						'morning'
					)
				).toHaveLength(
					1
				);
			}
		);

		it(
			'returns all pre-filtered rows for an empty search term',
			() => {
				const rows = [
					createRow({
						path: 'one'
					}),
					createRow({
						path: 'two'
					})
				];

				expect(
					createFilesystemSearchMatches(
						rows,
						'   '
					)
				).toHaveLength(
					2
				);
			}
		);

		it(
			'ignores rows whose name and path do not match',
			() => {
				const row =
					createRow({
						path: 'creation',
						name: 'Creation'
					});

				expect(
					createFilesystemSearchMatches(
						[row],
						'grace'
					)
				).toEqual([]);
			}
		);
	}
);

function createRow(
	overrides: {
		readonly publisher?: string;
		readonly rootPath?: string;
		readonly path: string;
		readonly name?: string;
	}
): StoredFilesystemEntry {
	const entry = {
		path:
			overrides.path,
		descriptor: {
			metadata: {
				publisher:
					'b'.repeat(
						64
					),
				resourceId:
					'notes/example',
				...(overrides.name
					? {
						name:
							overrides.name
					}
					: {}),
				category:
					'notes',
				dataType:
					'kjvonly.note/v1',
				modifiedAt:
					1,
				representation:
					'content' as const,
				mediaType:
					'application/json'
			},
			strategy: {
				type:
					'example',
				data: {}
			}
		}
	};

	const publisher =
		overrides.publisher ??
		'alice';

	const rootPath =
		overrides.rootPath ??
		'notes';

	return {
		id:
			`${publisher}/${rootPath}/${overrides.path}`,
		publisher,
		rootPath,
		path:
			overrides.path,
		value:
			entry
	};
}
