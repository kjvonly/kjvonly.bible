import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createPendingPublication
} from './outbox-entry';

describe(
	'OutboxEntry',
	() => {
		it(
			'creates a pending Resource publication without wrapping its intent',
			() => {
				const publication = {
					type:
						'resource',

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
				} as const;

				expect(
					createPendingPublication(
						'bible/text-markup:publisher/kjvs/1_3',
						publication
					)
				).toEqual({
					id:
						'bible/text-markup:publisher/kjvs/1_3',

					publication,

					status:
						'pending',

					attempts:
						0
				});
			}
		);

		it(
			'creates a pending Nostr event publication without relay policy',
			() => {
				const publication = {
					type:
						'nostr-event',
					publisher:
						'publisher',
					event: {
						kind:
							0,
						content:
							'{"name":"Stephen"}',
						tags: []
					}
				} as const;

				expect(
					createPendingPublication(
						'nostr/profile:publisher',
						publication
					)
				).toEqual({
					id:
						'nostr/profile:publisher',
					publication,
					status:
						'pending',
					attempts:
						0
				});
			}
		);
	}
);
