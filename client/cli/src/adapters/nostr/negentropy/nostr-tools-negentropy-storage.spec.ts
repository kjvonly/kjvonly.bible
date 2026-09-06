import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createNostrToolsNegentropyStorage
} from './nostr-tools-negentropy-storage.js';


describe(
	'createNostrToolsNegentropyStorage',
	() => {

		it(
			'builds a sealed Negentropy vector from reconciliation entries',
			() => {

				const firstId =
					'a'.repeat(
						64
					);


				const secondId =
					'b'.repeat(
						64
					);


				const storage =
					createNostrToolsNegentropyStorage([
						{
							eventId:
								secondId,

							createdAt:
								2000
						},
						{
							eventId:
								firstId,

							createdAt:
								1000
						}
					]);


				expect(
					storage.size()
				).toBe(
					2
				);


				expect(
					storage.getItem(
						0
					).timestamp
				).toBe(
					1000
				);


				expect(
					Buffer.from(
						storage.getItem(
							0
						).id
					).toString(
						'hex'
					)
				).toBe(
					firstId
				);


				expect(
					storage.getItem(
						1
					).timestamp
				).toBe(
					2000
				);


				expect(
					Buffer.from(
						storage.getItem(
							1
						).id
					).toString(
						'hex'
					)
				).toBe(
					secondId
				);
			}
		);
	}
);