import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createResourceInstallationId
} from './resource-installation';

describe(
	'createResourceInstallationId',
	() => {
		it(
			'creates a stable Resource Installation id',
			() => {
				const result =
					createResourceInstallationId(
						'bible/chapter',
						'abc123/kjvs/1_1'
					);

				expect(
					result
				).toBe(
					'bible/chapter:abc123/kjvs/1_1'
				);
			}
		);

		it(
			'keeps object type and object id distinct',
			() => {
				const chapter =
					createResourceInstallationId(
						'bible/chapter',
						'abc123/kjvs/1_1'
					);

				const strongs =
					createResourceInstallationId(
						'bible/strongs',
						'abc123/kjvs/1_1'
					);

				expect(
					chapter
				).not.toBe(
					strongs
				);
			}
		);

		it(
			'creates different ids for different Domain objects',
			() => {
				const genesis1 =
					createResourceInstallationId(
						'bible/chapter',
						'abc123/kjvs/1_1'
					);

				const genesis2 =
					createResourceInstallationId(
						'bible/chapter',
						'abc123/kjvs/1_2'
					);

				expect(
					genesis1
				).not.toBe(
					genesis2
				);
			}
		);

		it(
			'preserves publisher-scoped Domain identity',
			() => {
				const publisherA =
					createResourceInstallationId(
						'bible/chapter',
						'publisher-a/kjvs/1_1'
					);

				const publisherB =
					createResourceInstallationId(
						'bible/chapter',
						'publisher-b/kjvs/1_1'
					);

				expect(
					publisherA
				).not.toBe(
					publisherB
				);
			}
		);
	}
);