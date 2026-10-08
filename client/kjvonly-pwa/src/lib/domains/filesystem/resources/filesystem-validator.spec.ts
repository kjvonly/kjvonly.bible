import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	ResourceDescriptor
} from '$lib/resource';

import {
	FilesystemValidator
} from './filesystem-validator';

const DESCRIPTOR:
	ResourceDescriptor = {
		metadata: {
			publisher:
				'b'.repeat(64),
			resourceId:
				'note-creation',
			resourceType:
				'notes/note',
			dataType:
				'kjvonly.note',

			dataVersion:
				1,

			modifiedAt:
				50,
			representation:
				'content',
			mediaType:
				'application/json'
		},
		strategy: {
			type:
				'nostr',
			data: {}
		}
	};

describe(
	'FilesystemValidator',
	() => {
		it(
			'validates a full path below its root and delegates descriptor validation',
			() => {
				const validate =
					vi.fn()
						.mockReturnValue(
							DESCRIPTOR
						);

				const validator =
					new FilesystemValidator({
						validate
					});

				const rawDescriptor = {
					any:
						'value'
				};

				expect(
					validator.validate({
						rootPath:
							'notes/shared',
						path:
							'notes/shared/the-fall/creation',
						descriptor:
							rawDescriptor
					})
				).toEqual({
					rootPath:
						'notes/shared',
					path:
						'notes/shared/the-fall/creation',
					descriptor:
						DESCRIPTOR
				});

				expect(
					validate
				).toHaveBeenCalledWith(
					rawDescriptor
				);
			}
		);

		it.each([
			'/notes',
			'notes/../private',
			'notes/'
		])(
			'rejects a non-canonical Resource root without requiring an entry: %s',
			(rootPath) => {
				const validator =
					new FilesystemValidator({
						validate: () =>
							DESCRIPTOR
					});

				expect(
					() =>
						validator.validateRootPath(
							rootPath
						)
				).toThrow(
					'Invalid Filesystem rootPath'
				);
			}
		);

		it.each([
			['rootPath', '/notes', '/notes/entry'],
			['rootPath', 'notes/../private', 'notes/../private/entry'],
			['path', 'notes', '/notes/entry'],
			['path', 'notes', 'notes/folder/../entry'],
			['path', 'notes', 'notes/entry/']
		])(
			'rejects a non-canonical %s',
			(
				_name,
				rootPath,
				path
			) => {
				const validator =
					new FilesystemValidator({
						validate: () =>
							DESCRIPTOR
					});

				expect(
					() =>
						validator.validate({
							rootPath,
							path,
							descriptor:
								DESCRIPTOR
						})
				).toThrow(
					'Invalid Filesystem'
				);
			}
		);

		it.each([
			[
				'equals the root',
				'notes',
				'notes'
			],
			[
				'is root-relative instead of complete',
				'notes',
				'the-fall/creation'
			],
			[
				'is outside the root',
				'notes',
				'library/the-fall/creation'
			],
			[
				'only shares a lexical root prefix',
				'notes',
				'notes-private/creation'
			]
		])(
			'rejects a path that %s',
			(
				_description,
				rootPath,
				path
			) => {
				const validator =
					new FilesystemValidator({
						validate: () =>
							DESCRIPTOR
					});

				expect(
					() =>
						validator.validate({
							rootPath,
							path,
							descriptor:
								DESCRIPTOR
						})
				).toThrow(
					'Filesystem path must be a strict descendant of rootPath'
				);
			}
		);
	}
);
