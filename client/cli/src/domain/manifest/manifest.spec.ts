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

		collections: {},

		filesystems: {}
	};
}


function createFilesystemDefinition() {

	return {
		root:
			'library',

		event: {
			encoding: [
				'hex'
			],

			tags: [
				[
					'd',
					'kjvonly/filesystem/application-library'
				],
				[
					'm',
					'application/json+hex'
				],
				[
					't',
					'filesystem/entry'
				],
				[
					'dataType',
					'kjvonly.filesystem.entries'
				],
				[
					'dataVersion',
					'1'
				],
				[
					'representation',
					'content'
				]
			]
		},

		directories: [
			{
				path:
					'bible/chapters',

				resources: {
					'kjvs-chapters': {
						resource:
							'bundle'
					},

					'genesis-1': {
						resource:
							'bundle',

						key:
							'1_1'
					}
				},

				collections: {}
			}
		]
	};
}


function createCollectionDefinition() {
	return {
		event: {
			encoding: [
				'hex'
			],
			tags: [
				['d', 'collection'],
				['m', 'application/json+hex'],
				['t', 'resource/descriptor-collection'],
				['dataType', 'kjvonly.resource-descriptor-collection'],
				['dataVersion', '1'],
				['representation', 'descriptors']
			]
		},
		resources: [],
		collections: []
	};
}


function createManifestWithStagingName(
	kind:
		'Resource' | 'Collection' | 'Filesystem',

	name:
		string
) {
	const value =
		createManifest();


	switch (
		kind
	) {
		case 'Resource':
			return {
				...value,
				resources: {
					[name]:
						value.resources.bundle
				}
			};

		case 'Collection':
			return {
				...value,
				collections: {
					[name]:
						createCollectionDefinition()
				}
			};

		case 'Filesystem':
			return {
				...value,
				filesystems: {
					[name]:
						createFilesystemDefinition()
				}
			};
	}
}


describe(
	'validateManifest',
	() => {

		it.each([
			'__collections__',
			'__filesystems__'
		])(
			'rejects reserved Resource staging name %s',
			name => {
				expect(
					() =>
						validateManifest(
							createManifestWithStagingName(
								'Resource',
								name
							)
						)
				).toThrow(
					`Staging logical name is reserved: ${name}`
				);
			}
		);


		it.each([
			'Resource',
			'Collection',
			'Filesystem'
		] as const)(
			'rejects dot-prefixed %s staging name',
			kind => {
				expect(
					() =>
						validateManifest(
							createManifestWithStagingName(
								kind,
								'.hidden'
							)
						)
				).toThrow(
					'Staging logical name must not start with ".".'
				);
			}
		);


		it(
			'rejects path separators in Resource staging names',
			() => {
				expect(
					() =>
						validateManifest(
							createManifestWithStagingName(
								'Resource',
								'bad/name'
							)
						)
				).toThrow(
					'Staging logical name must not contain path separators.'
				);
			}
		);


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


		it(
			'accepts Filesystem bulk and selective Resource placements',
			() => {

				const value =
					createManifest();

				value.filesystems = {
					library:
						createFilesystemDefinition()
				};


				const manifest =
					validateManifest(
						value
					);


				expect(
					manifest
						.filesystems
						.library
						?.directories[0]
						?.resources
				).toEqual({
					'kjvs-chapters': {
						resource:
							'bundle'
					},

					'genesis-1': {
						resource:
							'bundle',
						key:
							'1_1'
					}
				});
			}
		);


		it(
			'accepts a Filesystem Collection placement and root-level directory',
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
								['d', 'defaults'],
								['m', 'application/json+hex'],
								['t', 'resource/descriptor-collection'],
								['dataType', 'kjvonly.resource-descriptor-collection'],
								['dataVersion', '1'],
								['representation', 'descriptors']
							]
						},

						resources: [
							'bundle'
						]
					}
				};

				const filesystem =
					createFilesystemDefinition();

				filesystem.directories = [
					{
						path:
							'',
						resources: {},
						collections: {
							defaults: {
								collection:
									'defaults'
							}
						}
					}
				];

				value.filesystems = {
					library:
						filesystem
				};


				const manifest =
					validateManifest(
						value
					);


				expect(
					manifest
						.filesystems
						.library
						?.directories[0]
						?.path
				).toBe('');
			}
		);


		it.each([
			'/library',
			'library/',
			'library//books',
			'library/../books'
		])(
			'rejects invalid Filesystem root %s',
			root => {

				const value =
					createManifest();

				const filesystem =
					createFilesystemDefinition();

				filesystem.root =
					root;

				value.filesystems = {
					library:
						filesystem
				};


				expect(
					() =>
						validateManifest(
							value
						)
				).toThrow(
					'Filesystem root must be a canonical path.'
				);
			}
		);


		it(
			'rejects an invalid Filesystem directory path',
			() => {

				const value =
					createManifest();

				const filesystem =
					createFilesystemDefinition();

				filesystem.directories[0]!.path =
					'bible/../chapters';

				value.filesystems = {
					library:
						filesystem
				};


				expect(
					() =>
						validateManifest(
							value
						)
				).toThrow(
					'Filesystem directory path must be canonical.'
				);
			}
		);


		it(
			'rejects a Filesystem placement name containing a path separator',
			() => {

				const value =
					createManifest();

				const filesystem =
					createFilesystemDefinition();

				filesystem.directories[0]!.resources = {
					'bible/genesis': {
						resource:
							'bundle'
					}
				};

				value.filesystems = {
					library:
						filesystem
				};


				expect(
					() =>
						validateManifest(
							value
						)
				).toThrow(
					'Invalid Filesystem placement name: bible/genesis'
				);
			}
		);


		it(
			'rejects an unknown Filesystem Resource reference',
			() => {

				const value =
					createManifest();

				const filesystem =
					createFilesystemDefinition();

				filesystem.directories[0]!.resources = {
					missing: {
						resource:
							'missing'
					}
				};

				value.filesystems = {
					library:
						filesystem
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
			'rejects an unknown Filesystem Collection reference',
			() => {

				const value =
					createManifest();

				const filesystem =
					createFilesystemDefinition();

				filesystem.directories[0]!.resources = {};
				filesystem.directories[0]!.collections = {
					missing: {
						collection:
							'missing'
					}
				};

				value.filesystems = {
					library:
						filesystem
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
			'rejects an empty Filesystem directory definition',
			() => {

				const value =
					createManifest();

				const filesystem =
					createFilesystemDefinition();

				filesystem.directories[0]!.resources = {};
				filesystem.directories[0]!.collections = {};

				value.filesystems = {
					library:
						filesystem
				};


				expect(
					() =>
						validateManifest(
							value
						)
				).toThrow(
					'Filesystem directory must contain at least one Resource or Collection placement.'
				);
			}
		);


		it(
			'rejects one Filesystem placement name reused by a Resource and Collection',
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
								['d', 'defaults'],
								['m', 'application/json+hex'],
								['t', 'resource/descriptor-collection'],
								['dataType', 'kjvonly.resource-descriptor-collection'],
								['dataVersion', '1'],
								['representation', 'descriptors']
							]
						},

						resources: [
							'bundle'
						]
					}
				};

				const filesystem =
					createFilesystemDefinition();

				filesystem.directories[0]!.resources = {
					defaults: {
						resource:
							'bundle'
					}
				};

				filesystem.directories[0]!.collections = {
					defaults: {
						collection:
							'defaults'
					}
				};

				value.filesystems = {
					library:
						filesystem
				};


				expect(
					() =>
						validateManifest(
							value
						)
				).toThrow(
					'Filesystem placement name is used by both a Resource and Collection: defaults'
				);
			}
		);

		it(
			'rejects an explicit Filesystem f tag',
			() => {

				const value =
					createManifest();

				const filesystem =
					createFilesystemDefinition();

				filesystem.event.tags.push([
					'f',
					'library'
				]);

				value.filesystems = {
					library:
						filesystem
				};


				expect(
					() =>
						validateManifest(
							value
						)
				).toThrow(
					'Filesystem event must not declare an "f" tag'
				);
			}
		);


		it.each([
			['t', 'other/resource', 'filesystem/entry'],
			['dataType', 'kjvonly.other', 'kjvonly.filesystem.entries'],
			['dataVersion', '2', '1'],
			['representation', 'descriptors', 'content']
		])(
			'rejects Filesystem %s tag value %s',
			(
				tagName,
				actualValue,
				expectedValue
			) => {

				const value =
					createManifest();

				const filesystem =
					createFilesystemDefinition();

				const tag =
					filesystem.event.tags.find(
						candidate =>
							candidate[0] ===
								tagName
					);

				if (tag === undefined) {
					throw new Error(
						`Missing ${tagName} test fixture.`
					);
				}

				tag[1] =
					actualValue;

				value.filesystems = {
					library:
						filesystem
				};


				expect(
					() =>
						validateManifest(
							value
						)
				).toThrow(
					`Filesystem event "${tagName}" tag must be "${expectedValue}".`
				);
			}
		);

	}
);