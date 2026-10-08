import {
	describe,
	expect,
	it
} from 'vitest';

import {
	calculateFilesystemInputRevision
} from './filesystem-input-revision.js';


function createInput() {
	return {
		kind:
			37770,
		publisher:
			'a'.repeat(64),
		root:
			'library',
		event: {
			encoding:
				[] as const,
			tags: [
				['d', 'kjvonly/filesystem/library'],
				['representation', 'content']
			]
		},
		relays: [
			'wss://relay.example'
		],
		references: [
			{
				path:
					'library/books/foo',
				eventId:
					'b'.repeat(64)
			}
		]
	};
}


describe(
	'calculateFilesystemInputRevision',
	() => {
		it(
			'is stable for identical semantic inputs',
			() => {
				expect(
					calculateFilesystemInputRevision(
						createInput()
					)
				).toBe(
					calculateFilesystemInputRevision(
						createInput()
					)
				);
			}
		);


		it.each([
			[
				'root',
				(input: ReturnType<typeof createInput>) => ({
					...input,
					root:
						'other'
				})
			],
			[
				'relays',
				(input: ReturnType<typeof createInput>) => ({
					...input,
					relays: [
						'wss://other.example'
					]
				})
			],
			[
				'target event ID',
				(input: ReturnType<typeof createInput>) => ({
					...input,
					references: [
						{
							...input.references[0]!,
							eventId:
								'c'.repeat(64)
						}
					]
				})
			],
			[
				'generated path',
				(input: ReturnType<typeof createInput>) => ({
					...input,
					references: [
						{
							...input.references[0]!,
							path:
								'library/books/bar'
						}
					]
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
					calculateFilesystemInputRevision(
						change(
							input
						)
					)
				).not.toBe(
					calculateFilesystemInputRevision(
						input
					)
				);
			}
		);
	}
);
