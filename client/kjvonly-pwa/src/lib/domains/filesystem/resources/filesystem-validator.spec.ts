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
			category:
				'kjvonly/notes/entries',
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
			'validates filesystem placement and delegates descriptor validation',
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
							'the-fall/creation',
						descriptor:
							rawDescriptor
					})
				).toEqual({
					rootPath:
						'notes/shared',
					path:
						'the-fall/creation',
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
			['rootPath', '/notes', 'entry'],
			['rootPath', 'notes/../private', 'entry'],
			['path', 'notes', '/entry'],
			['path', 'notes', 'folder/../entry']
		])(
			'rejects an invalid %s',
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
	}
);
