import {
	describe,
	expect,
	it
} from 'vitest';

import {
	type DecodedFilesystemResourceContent,
	FilesystemInterpreter
} from './filesystem-interpreter';

import {
	FILESYSTEM_ENTRIES_DATA_TYPE,
	FILESYSTEM_ENTRIES_DATA_VERSION,
	FILESYSTEM_RESOURCE_TYPE
} from './filesystem-resource';

const TARGET_PUBLISHER =
	'b'.repeat(64);

describe(
	'FilesystemInterpreter',
	() => {
		it(
			'interprets f as rootPath and preserves full payload paths',
			() => {
				const descriptor =
					createDescriptor();

				const candidates =
					Array.from(
						new FilesystemInterpreter()
							.interpret(
								createResource({
									value: {
										'notes/the-fall/creation': {
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
							'notes/the-fall/creation',
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
										'notes/entry': {
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
		Partial<DecodedFilesystemResourceContent> = {}
): DecodedFilesystemResourceContent {
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

function createDescriptor() {
	return {
		metadata: {
			publisher:
				TARGET_PUBLISHER,
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
