import {
	describe,
	expect,
	it
} from 'vitest';

import {
	assertStagingLogicalName,
	STAGED_COLLECTIONS_DIRECTORY,
	STAGED_FILESYSTEMS_DIRECTORY
} from './staging-layout.js';


describe(
	'assertStagingLogicalName',
	() => {
		it.each([
			'bible-chapters-kjvs',
			'application.defaults',
			'filesystem-smoke'
		])(
			'accepts staging-safe logical name %s',
			value => {
				expect(
					() =>
						assertStagingLogicalName(
							value
						)
				).not.toThrow();
			}
		);


		it.each([
			[
				STAGED_COLLECTIONS_DIRECTORY,
				`Staging logical name is reserved: ${STAGED_COLLECTIONS_DIRECTORY}`
			],
			[
				STAGED_FILESYSTEMS_DIRECTORY,
				`Staging logical name is reserved: ${STAGED_FILESYSTEMS_DIRECTORY}`
			],
			[
				'.hidden',
				'Staging logical name must not start with ".".'
			],
			[
				'bad/name',
				'Staging logical name must not contain path separators.'
			],
			[
				'é'.repeat(65),
				'Staging logical name exceeds 128 UTF-8 bytes.'
			]
		])(
			'rejects staging-unsafe logical name %s',
			(
				value,
				message
			) => {
				expect(
					() =>
						assertStagingLogicalName(
							value
						)
				).toThrow(
					message
				);
			}
		);
	}
);
