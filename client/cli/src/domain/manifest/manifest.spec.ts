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
							'test/resource'
						],
						[
							'dataType',
							'kjvonly.test'
						],
						[
							'dataVersion',
							'1'
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
			'accepts a collection that references another collection',
			() => {

				const value =
					createManifest();


				value.collections = {
					child: {
						event: {
							encoding: [
								'hex'
							],

							tags: [
								[
									'd',
									'child'
								],
								[
									'm',
									'application/json+hex'
								],
								[
									't',
									'resource/descriptor-collection'
								],
								[
									'dataType',
									'kjvonly.resource-descriptor-collection'
								],
								[
									'dataVersion',
									'1'
								],
								[
									'representation',
									'descriptors'
								]
							]
						},

						resources: [
							'bundle'
						]
					},

					parent: {
						event: {
							encoding: [
								'hex'
							],

							tags: [
								[
									'd',
									'parent'
								],
								[
									'm',
									'application/json+hex'
								],
								[
									't',
									'resource/descriptor-collection'
								],
								[
									'dataType',
									'kjvonly.resource-descriptor-collection'
								],
								[
									'dataVersion',
									'1'
								],
								[
									'representation',
									'descriptors'
								]
							]
						},

						resources: [],

						collections: [
							'child'
						]
					}
				};


				const manifest =
					validateManifest(
						value
					);


				expect(
					manifest
						.collections
						.parent
						.collections
				).toEqual([
					'child'
				]);
			}
		);


		it(
			'rejects an unknown nested collection',
			() => {

				const value =
					createManifest();


				value.collections = {
					parent: {
						event: {
							encoding: [
								'hex'
							],

							tags: [
								[
									'd',
									'parent'
								]
							]
						},

						resources: [],

						collections: [
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
					'Unknown Collection: missing'
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
								],
								[
									'm',
									'application/json+hex'
								],
								[
									't',
									'resource/descriptor-collection'
								],
								[
									'dataType',
									'kjvonly.resource-descriptor-collection'
								],
								[
									'dataVersion',
									'1'
								],
								[
									'representation',
									'descriptors'
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


		it(
			'rejects a Resource event without a semantic data contract',
			() => {

				const value =
					createManifest();


				value.resources.bundle.event.tags =
					value.resources.bundle.event.tags
						.filter(
							tag =>
								tag[0] !== 'dataType'
						);


				expect(
					() =>
						validateManifest(
							value
						)
				).toThrow(
					'Resource event requires exactly one "dataType" tag.'
				);
			}
		);


		it(
			'rejects an invalid Resource data version',
			() => {

				const value =
					createManifest();


				const tag =
					value.resources.bundle.event.tags
						.find(
							tag =>
								tag[0] === 'dataVersion'
						);


				if (tag === undefined) {
					throw new Error(
						'Missing dataVersion test fixture.'
					);
				}


				tag[1] =
					'0';


				expect(
					() =>
						validateManifest(
							value
						)
				).toThrow(
					'Resource event dataVersion must be a positive integer.'
				);
			}
		);

	}
);