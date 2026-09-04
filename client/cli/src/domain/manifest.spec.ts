import {
	describe,
	expect,
	it
} from 'vitest';

import {
	validateManifest
} from './manifest.js';


function createManifest() {

	return {
		version: 1,

		kind: 37770,

		staging: {
			path:
				'./.kjvonly'
		},

		nostr: {
			relays: [
				'wss://relay.example'
			]
		},

		defaults: {
			strategy:
				'primary'
		},

		strategies: {
			primary: {
				type:
					'blossom',

				urls: [
					'https://blossom.example'
				]
			}
		},

		resources: {
			bundle: {
				path:
					'./data.json.gz',

				event: {
					encoding: [
						'hex'
					],

					tags: [
						[
							'd',
							'kjvonly/test/default'
						],
						[
							'm',
							'application/json+hex'
						],
						[
							't',
							'kjvonly/test'
						],
						[
							'representation',
							'descriptors'
						]
					]
				},

				'object-upload': {
					mediaType:
						'application/json+gzip',

					encoding: []
				}
			}
		},

		collections: {}
	};
}


describe(
	'validateManifest',
	() => {

		it(
			'accepts a valid v1 manifest',
			() => {

				const manifest =
					validateManifest(
						createManifest()
					);


				expect(
					manifest.version
				).toBe(1);


				expect(
					manifest.kind
				).toBe(37770);
			}
		);


		it(
			'rejects an unknown version',
			() => {

				const value =
					createManifest();


				value.version = 2;


				expect(
					() =>
						validateManifest(
							value
						)
				).toThrow(
					'Manifest validation failed'
				);
			}
		);


		it(
			'rejects an empty relay list',
			() => {

				const value =
					createManifest();


				value.nostr.relays =
					[];


				expect(
					() =>
						validateManifest(
							value
						)
				).toThrow(
					'Manifest validation failed'
				);
			}
		);


		it(
			'rejects an unknown default strategy',
			() => {

				const value =
					createManifest();


				value.defaults.strategy =
					'missing';


				expect(
					() =>
						validateManifest(
							value
						)
				).toThrow(
					'Unknown default strategy: missing'
				);
			}
		);


		it(
			'rejects an unknown Resource strategy',
			() => {

				const value =
					createManifest();


				value.resources
					.bundle[
						'object-upload'
					].strategy =
						'missing';


				expect(
					() =>
						validateManifest(
							value
						)
				).toThrow(
					'Unknown strategy: missing'
				);
			}
		);


		it(
			'rejects an unknown collection Resource',
			() => {

				const value =
					createManifest();


				value.collections = {
					defaults: {
						event: {
							encoding: [
								'hex'
							],

							tags: [
								[
									'd',
									'collection'
								]
							]
						},

						resources: [
							'missing'
						]
					}
				};


				expect(
					() =>
						validateManifest(
							value
						)
				).toThrow(
					'Unknown Resource: missing'
				);
			}
		);
	}
);