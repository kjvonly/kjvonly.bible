import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	DecodedResourceContent,
	ResourceDescriptor
} from '$lib/resource';

import {
	FilesystemResourceHandler
} from './filesystem-resource-handler';

import {
	FILESYSTEM_ENTRIES_DATA_TYPE,
	FILESYSTEM_ENTRIES_DATA_VERSION,
	FILESYSTEM_RESOURCE_TYPE
} from './filesystem-resource';

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
	'FilesystemResourceHandler',
	() => {
		it(
			'validates semantic data before interpreting validating and installing filesystem mappings',
			async () => {
				const resource =
					createResource({
						value: {
							creation: {
								descriptor: {
									raw: true
								}
							}
						}
					});
				const data =
					resource.value as Record<
						string,
						{ descriptor: unknown }
					>;
				const candidate = {
					rootPath:
						'notes',
					path:
						'creation',
					descriptor: {
						raw:
							true
					}
				};
				const validated = {
					rootPath:
						'notes',
					path:
						'creation',
					descriptor:
						DESCRIPTOR
				};
				const validateData =
					vi.fn()
						.mockReturnValue(
							data
						);
				const interpret =
					vi.fn()
						.mockReturnValue([
							candidate
						]);
				const validate =
					vi.fn()
						.mockReturnValue(
							validated
						);
				const install =
					vi.fn()
						.mockResolvedValue(
							undefined
						);

				await new FilesystemResourceHandler(
					{
						dataType:
							FILESYSTEM_ENTRIES_DATA_TYPE,
						dataVersion:
							FILESYSTEM_ENTRIES_DATA_VERSION,
						validate:
							validateData
					},
					{
						resourceType:
							FILESYSTEM_RESOURCE_TYPE,
						interpret
					},
					{
						validate
					},
					{
						install
					}
				).handle(
					resource
				);

				expect(
					validateData
				).toHaveBeenCalledWith(
					resource.value
				);
				expect(
					interpret
				).toHaveBeenCalledWith(
					expect.objectContaining({
						value:
							data
					})
				);
				expect(
					validate
				).toHaveBeenCalledWith(
					candidate
				);
				expect(
					install
				).toHaveBeenCalledWith(
					expect.objectContaining({
						value:
							data
					}),
					[
						validated
					]
				);
			}
		);

		it(
			'rejects a semantic data contract that does not belong to Filesystem entries',
			async () => {
				const interpret =
					vi.fn();

				await expect(
					new FilesystemResourceHandler(
						{
							dataType:
								FILESYSTEM_ENTRIES_DATA_TYPE,
							dataVersion:
								FILESYSTEM_ENTRIES_DATA_VERSION,
							validate:
								vi.fn()
						},
						{
							resourceType:
								FILESYSTEM_RESOURCE_TYPE,
							interpret
						},
						{
							validate:
								vi.fn()
						},
						{
							install:
								vi.fn()
						}
					).handle(
						createResource({
							dataType:
								'kjvonly.note'
						})
					)
				).rejects.toThrow(
					'Unsupported Filesystem Resource data type: kjvonly.note@1'
				);

				expect(
					interpret
				).not.toHaveBeenCalled();
			}
		);
	}
);

function createResource(
	overrides:
		Partial<DecodedResourceContent> = {}
): DecodedResourceContent {
	return {
		publisher:
			'a'.repeat(64),
		resourceId:
			'my-filesystem',
		resourceType:
			FILESYSTEM_RESOURCE_TYPE,

		dataType:
			FILESYSTEM_ENTRIES_DATA_TYPE,

		dataVersion:
			FILESYSTEM_ENTRIES_DATA_VERSION,
		modifiedAt:
			100,
		mediaType:
			'application/json',
		metadata: {
			f:
				'notes'
		},
		value: {},
		...overrides
	};
}
