import {
	describe,
	expect,
	it
} from 'vitest';

import {
	MockFilesystemRuntime
} from './mock-filesystem-runtime';

describe(
	'MockFilesystemRuntime',
	() => {
		it(
			'exposes deterministic mounted roots and root-prefixed entries',
			async () => {
				const runtime =
					new MockFilesystemRuntime();

				await expect(
					runtime.listRoots()
				).resolves.toEqual([
					{ publisher: 'Demo Library', rootPath: 'library' },
					{ publisher: 'Demo Library', rootPath: 'media' },
					{ publisher: 'Grace Church', rootPath: 'shared' }
				]);

				const entries =
					await runtime.listByRootPath(
						'Demo Library',
						'library'
					);

				expect(entries.length)
					.toBeGreaterThan(0);
				expect(
					entries.every(
						(entry) => entry.path.startsWith('library/')
					)
				).toBe(true);

				expect(
					entries.find(
						(entry) => entry.path === 'library/sermons/sunday/romans-8'
					)?.descriptor.resourceMetadata?.icon
				).toBe('article');

				expect(
					entries.find(
						(entry) => entry.path === 'library/sermons/sunday/romans-8'
					)?.descriptor.resourceMetadata?.category
				).toBe('sermons');

				expect(
					entries.find(
						(entry) => entry.path === 'library/books/theology/knowing-god'
					)?.descriptor.resourceMetadata?.icon
				).toBe('book');
			}
		);

		it(
			'supports the same indexed metadata search seam as FilesystemService',
			async () => {
				const runtime =
					new MockFilesystemRuntime();

				const matches =
					await runtime.search(
						{
							index: 'resourceType',
							value: 'notes/note'
						},
						'romans'
					);

				expect(matches)
					.toHaveLength(1);
				expect(matches[0]?.entry.descriptor.metadata.name)
					.toBe('Romans 8 Study Notes');
			}
		);
	}
);
