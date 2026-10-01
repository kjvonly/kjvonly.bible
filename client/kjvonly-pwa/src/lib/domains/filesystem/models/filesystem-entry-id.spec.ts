import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createFilesystemEntryId
} from './filesystem-entry-id';

describe(
	'Filesystem entry identity',
	() => {
		it(
			'uses the filesystem source publisher, root, and relative path',
			() => {
				expect(
					createFilesystemEntryId(
						'alice',
						'notes',
						'the-fall/creation'
					)
				).toBe(
					JSON.stringify([
						'alice',
						'notes',
						'the-fall/creation'
					])
				);
			}
		);

		it(
			'allows different publishers to expose the same root and path independently',
			() => {
				const alice =
					createFilesystemEntryId(
						'alice',
						'shared',
						'item'
					);

				const bob =
					createFilesystemEntryId(
						'bob',
						'shared',
						'item'
					);

				expect(
					alice
				).not.toBe(
					bob
				);
			}
		);

		it(
			'allows the same relative path under different roots',
			() => {
				const notes =
					createFilesystemEntryId(
						'alice',
						'notes',
						'favorites/item'
					);

				const audio =
					createFilesystemEntryId(
						'alice',
						'audio',
						'favorites/item'
					);

				expect(
					notes
				).not.toBe(
					audio
				);
			}
		);

		it.each([
			[
				'publisher',
				'',
				'notes',
				'item'
			],
			[
				'rootPath',
				'alice',
				'',
				'item'
			],
			[
				'path',
				'alice',
				'notes',
				''
			]
		])(
			'rejects an empty %s identity component',
			(
				label,
				publisher,
				rootPath,
				path
			) => {
				expect(
					() =>
						createFilesystemEntryId(
							publisher,
							rootPath,
							path
						)
				).toThrow(
					`Invalid filesystem entry ${label}:`
				);
			}
		);
	}
);
