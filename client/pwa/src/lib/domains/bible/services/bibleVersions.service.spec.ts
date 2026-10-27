import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BibleVersion
} from '../models/bible-version.model';

import {
	BibleVersionsService
} from './bibleVersions.service';

describe(
	'BibleVersionsService',
	() => {
		it(
			'lists versions by version name and then publisher',
			async () => {
				const service =
					createService([
						createVersion(
							'publisher-b',
							'kjvs'
						),
						createVersion(
							'publisher-c',
							'kjv'
						),
						createVersion(
							'publisher-a',
							'kjv'
						)
					]);

				await expect(
					service.list()
				).resolves.toEqual([
					createVersion(
						'publisher-a',
						'kjv'
					),
					createVersion(
						'publisher-c',
						'kjv'
					),
					createVersion(
						'publisher-b',
						'kjvs'
					)
				]);
			}
		);

		it(
			'resolves an installed version by its complete id',
			async () => {
				const selected =
					createVersion(
						'publisher-a',
						'kjvs'
					);

				const service =
					createService([
						selected
					]);

				await expect(
					service.resolve(
						selected.id
					)
				).resolves.toBe(
					selected
				);
			}
		);

		it(
			'preserves a valid selected version id even when it is not installed',
			async () => {
				const service =
					createService([]);

				await expect(
					service.resolve(
						'publisher-a/study'
					)
				).resolves.toEqual({
					id:
						'publisher-a/study',
					publisher:
						'publisher-a',
					version:
						'study'
				});
			}
		);

		it(
			'falls back to the first installed version for an invalid legacy selection',
			async () => {
				const first =
					createVersion(
						'publisher-a',
						'kjv'
					);

				const service =
					createService([
						createVersion(
							'publisher-b',
							'kjvs'
						),
						first
					]);

				await expect(
					service.resolve(
						'kjvs'
					)
				).resolves.toBe(
					first
				);
			}
		);

		it(
			'falls back to the configured default when no versions are installed',
			async () => {
				const defaultVersion =
					createVersion(
						'default-publisher',
						'kjvs'
					);

				const service =
					createService(
						[],
						defaultVersion
					);

				await expect(
					service.resolve(
						undefined
					)
				).resolves.toBe(
					defaultVersion
				);
			}
		);
	}
);

function createService(
	versions:
		readonly BibleVersion[],
	defaultVersion:
		BibleVersion =
			createVersion(
				'default-publisher',
				'kjvs'
			)
): BibleVersionsService {
	return new BibleVersionsService(
		{
			list:
				async () =>
					versions
		},
		defaultVersion
	);
}

function createVersion(
	publisher: string,
	version: string
): BibleVersion {
	return {
		id:
			`${publisher}/${version}`,
		publisher,
		version
	};
}
