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
	'FilesystemResourceHandler',
	() => {
		it(
			'interprets validates and installs filesystem mappings',
			async () => {
				const resource =
					createResource();
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
						resourceType:
							'fs',
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
					interpret
				).toHaveBeenCalledWith(
					resource
				);
				expect(
					validate
				).toHaveBeenCalledWith(
					candidate
				);
				expect(
					install
				).toHaveBeenCalledWith(
					resource,
					[
						validated
					]
				);
			}
		);
	}
);

function createResource():
	DecodedResourceContent {
	return {
		publisher:
			'a'.repeat(64),
		resourceId:
			'my-filesystem',
		resourceType:
			'fs',
		modifiedAt:
			100,
		mediaType:
			'application/json',
		metadata: {
			f:
				'notes'
		},
		value: {}
	};
}
