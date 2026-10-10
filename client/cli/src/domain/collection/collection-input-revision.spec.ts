import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	ResourceDescriptor
} from '../resource/resource-descriptor.js';

import {
	calculateCollectionInputRevision
} from './collection-input-revision.js';


function createDescriptor(
	resourceId:
		string,

	modifiedAt =
		100
): ResourceDescriptor {
	return {
		metadata: {
			publisher:
				'a'.repeat(64),
			resourceId,
			resourceType:
				'test/resource',
			dataType:
				'kjvonly.test',
			dataVersion:
				1,
			modifiedAt,
			representation:
				'content',
			mediaType:
				'application/json'
		},
		strategy: {
			type:
				'nostr',
			data: {
				kind:
					37770,
				relays: [
					'wss://relay.example'
				]
			}
		}
	};
}


function createInput() {
	return {
		kind:
			37770,
		publisher:
			'b'.repeat(64),
		event: {
			encoding: [
				'hex' as const
			],
			tags: [
				[
					'd',
					'kjvonly/resources/collections/default'
				]
			]
		},
		descriptors: [
			createDescriptor(
				'kjvonly/test/1'
			),
			createDescriptor(
				'kjvonly/test/2'
			)
		]
	};
}


describe(
	'calculateCollectionInputRevision',
	() => {
		it(
			'is stable for identical semantic inputs',
			() => {
				expect(
					calculateCollectionInputRevision(
						createInput()
					)
				).toBe(
					calculateCollectionInputRevision(
						createInput()
					)
				);
			}
		);


		it.each([
			[
				'publisher',
				(input: ReturnType<typeof createInput>) => ({
					...input,
					publisher:
						'c'.repeat(64)
				})
			],
			[
				'event definition',
				(input: ReturnType<typeof createInput>) => ({
					...input,
					event: {
						...input.event,
						tags: [
							[
								'd',
								'kjvonly/resources/collections/other'
							]
						]
					}
				})
			],
			[
				'descriptor revision',
				(input: ReturnType<typeof createInput>) => ({
					...input,
					descriptors: [
						createDescriptor(
							'kjvonly/test/1',
							101
						),
						input.descriptors[1]!
					]
				})
			],
			[
				'descriptor order',
				(input: ReturnType<typeof createInput>) => ({
					...input,
					descriptors: [
						...input.descriptors
					].reverse()
				})
			]
		])(
			'changes when %s changes',
			(
				_label,
				change
			) => {
				const input =
					createInput();


				expect(
					calculateCollectionInputRevision(
						change(
							input
						)
					)
				).not.toBe(
					calculateCollectionInputRevision(
						input
					)
				);
			}
		);
	}
);
