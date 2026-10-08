import {
	describe,
	expect,
	it
} from 'vitest';

import {
	buildStagedFilesystemEventFilename,
	parseStagedFilesystemEventFilename
} from './staged-filesystem-event-filename.js';


describe(
	'staged Filesystem event filename',
	() => {
		it(
			'round-trips generated-event metadata',
			() => {
				const metadata = {
					filesystemName:
						'library',
					inputRevision:
						'a'.repeat(32),
					createdAt:
						123,
					eventId:
						'b'.repeat(64)
				};


				expect(
					parseStagedFilesystemEventFilename(
						buildStagedFilesystemEventFilename(
							metadata
						)
					)
				).toEqual(
					metadata
				);
			}
		);


		it(
			'rejects path separators in the manifest Filesystem name',
			() => {
				expect(
					() =>
						buildStagedFilesystemEventFilename({
							filesystemName:
								'bad/name',
							inputRevision:
								'a'.repeat(32),
							createdAt:
								123,
							eventId:
								'b'.repeat(64)
						})
				).toThrow(
					'Filesystem name must not contain path separators.'
				);
			}
		);
	}
);
