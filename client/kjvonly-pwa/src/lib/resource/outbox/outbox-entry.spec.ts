import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createPendingResourcePublication
} from './outbox-entry';

describe(
	'OutboxEntry',
	() => {
		it(
			'uses the supplied Domain Object storage id as the Outbox id',
			() => {
				const resource = {
					publisher:
						'publisher',

					resourceType:
						'kjvonly/overlays/text-markup',

					resourceId:
						'kjvonly/overlays/text-markup/kjvs/1_3',

					representation:
						'content',

					mediaType:
						'application/json+gzip+hex',

					value: {
						'1': {
							'0': {
								class: [
									'bg-highlighta'
								]
							}
						}
					}
				};

				expect(
					createPendingResourcePublication(
						'bible/text-markup:publisher/kjvs/1_3',
						resource
					)
				).toEqual({
					id:
						'bible/text-markup:publisher/kjvs/1_3',

					resource,

					status:
						'pending',

					attempts:
						0
				});
			}
		);
	}
);
