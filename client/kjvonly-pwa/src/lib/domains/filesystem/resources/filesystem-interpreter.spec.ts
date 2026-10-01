import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	DecodedResourceContent
} from '$lib/resource';

import {
	FilesystemInterpreter
} from './filesystem-interpreter';

const TARGET_PUBLISHER =
	'b'.repeat(64);

describe(
	'FilesystemInterpreter',
	() => {
		it(
			'interprets f as rootPath and payload keys as root-relative paths',
			() => {
				const descriptor =
					createDescriptor();

				const candidates =
					Array.from(
						new FilesystemInterpreter()
							.interpret(
								createResource({
									value: {
										'the-fall/creation': {
											descriptor
										}
									}
								})
							)
					);

				expect(
					candidates
				).toEqual([
					{
						rootPath:
							'notes',
						path:
							'the-fall/creation',
						descriptor
					}
				]);
			}
		);

		it(
			'requires f metadata',
			() => {
				expect(
					() =>
						new FilesystemInterpreter()
							.interpret(
								createResource({
									metadata:
										undefined
								})
							)
				).toThrow(
					'Filesystem Resource is missing f metadata.'
				);
			}
		);

		it(
			'does not resolve or transform the target descriptor',
			() => {
				const descriptor =
					createDescriptor();

				const [candidate] =
					Array.from(
						new FilesystemInterpreter()
							.interpret(
								createResource({
									value: {
										entry: {
											descriptor
										}
									}
								})
							)
					);

				expect(
					candidate.descriptor
				).toBe(
					descriptor
				);
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
			'fs',
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

function createDescriptor() {
	return {
		metadata: {
			publisher:
				TARGET_PUBLISHER,
			resourceId:
				'note-creation',
			category:
				'kjvonly/notes/entries',
			modifiedAt:
				50,
			representation:
				'content' as const,
			mediaType:
				'application/json'
		},
		strategy: {
			type:
				'nostr',
			data: {}
		}
	};
}
