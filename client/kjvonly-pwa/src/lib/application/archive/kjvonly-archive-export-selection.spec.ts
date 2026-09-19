import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	ResourceInstallation
} from '$lib/resource';

import {
	matchesKJVOnlyArchiveExportSelection,
	matchesObjectIdPatterns,
	parseKJVOnlyArchiveExportPatterns
} from './kjvonly-archive-export-selection';

describe(
	'KJVOnly Archive export selection',
	() => {
		it(
			'parses comma-delimited patterns',
			() => {
				expect(
					parseKJVOnlyArchiveExportPatterns(
						' kjv, kjvs, kjv '
					)
				).toEqual([
					'kjv',
					'kjvs'
				]);
			}
		);

		it.each([
			[
				'publisher/kjvs/10_13',
				['kjvs'],
				true
			],
			[
				'publisher/kjvs/10_13',
				['kjv'],
				false
			],
			[
				'publisher/default/my-sermon-note-001',
				['*my-sermon-note*'],
				true
			],
			[
				'publisher/default/my-sermon-note-001',
				['default*'],
				true
			],
			[
				'publisher/default/my-sermon-note-001',
				['default/my-sermon-note*'],
				true
			],
			[
				'publisher/default/my-sermon-note-001',
				[],
				true
			],
			[
				'publisher/default/my-sermon-note-001',
				['*'],
				true
			]
		])(
			'matches %s against %j',
			(
				objectId,
				patterns,
				expected
			) => {
				expect(
					matchesObjectIdPatterns(
						objectId,
						patterns
					)
				).toBe(
					expected
				);
			}
		);

		it(
			'requires the object type to be selected before applying patterns',
			() => {
				const installation:
					ResourceInstallation = {
						id:
							'notes/note:publisher/default/my-sermon-note-001',
						objectType:
							'notes/note',
						objectId:
							'publisher/default/my-sermon-note-001',
						publisher:
							'publisher',
						modifiedAt:
							100
					};

				expect(
					matchesKJVOnlyArchiveExportSelection(
						installation,
						{
							types: [
								{
									objectType:
										'notes/note',
									patterns: [
										'*sermon*'
									]
								}
							]
						}
					)
				).toBe(true);

				expect(
					matchesKJVOnlyArchiveExportSelection(
						installation,
						{
							types: [
								{
									objectType:
										'bible/chapter',
									patterns: [
										'*sermon*'
									]
								}
							]
						}
					)
				).toBe(false);
			}
		);
	}
);
