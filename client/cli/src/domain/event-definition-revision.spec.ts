import {
	describe,
	expect,
	it
} from 'vitest';

import {
	calculateEventDefinitionRevision
} from './event-definition-revision.js';


function createInput() {

	return {
		kind:
			37770,

		event: {
			encoding: [
				'hex' as const
			],

			tags: [
				[
					'd',
					'kjvonly/test/1_1'
				]
			]
		},

		publisher:
			'a'.repeat(
				64
			)
	};
}


describe(
	'calculateEventDefinitionRevision',
	() => {

		it(
			'is stable for the same definition',
			() => {

				const input =
					createInput();


				expect(
					calculateEventDefinitionRevision(
						input
					)
				).toBe(
					calculateEventDefinitionRevision(
						input
					)
				);
			}
		);


		it(
			'changes when event tags change',
			() => {

				const first =
					createInput();


				const second =
					createInput();


				second.event.tags[0] = [
					'd',
					'kjvonly/test/1_2'
				];


				expect(
					calculateEventDefinitionRevision(
						first
					)
				).not.toBe(
					calculateEventDefinitionRevision(
						second
					)
				);
			}
		);


		it(
			'changes when publisher changes',
			() => {

				const first =
					createInput();


				const second =
					createInput();


				second.publisher =
					'b'.repeat(
						64
					);


				expect(
					calculateEventDefinitionRevision(
						first
					)
				).not.toBe(
					calculateEventDefinitionRevision(
						second
					)
				);
			}
		);
	}
);