import {
	z
} from 'zod';

import {
	FILESYSTEM_ENTRIES_DATA_TYPE,
	FILESYSTEM_ENTRIES_DATA_VERSION,
	FILESYSTEM_RESOURCE_TYPE,
	FILESYSTEM_ROOT_METADATA_KEY
} from '#domain/filesystem/filesystem-resource-contract.js';

import {
	isCanonicalFilesystemDirectoryPath,
	isCanonicalFilesystemPath,
	isFilesystemPathSegment
} from '#domain/filesystem/filesystem-path.js';

import {
	getStagingLogicalNameError
} from '#domain/staging/staging-layout.js';


const nonEmptyString =
	z.string()
		.trim()
		.min(1);


export const encodingSchema =
	z.enum([
		'gzip',
		'hex'
	]);


export const tagSchema =
	z.array(
		z.string()
	)
	.min(1);


export const eventDefinitionSchema =
	z.object({
		encoding:
			z.array(
				encodingSchema
			),

		tags:
			z.array(
				tagSchema
			)
	});


export const blossomStrategyDefinitionSchema =
	z.object({
		type:
			z.literal(
				'blossom'
			),

		urls:
			z.array(
				nonEmptyString
			)
			.min(1)
	});


export const objectUploadDefinitionSchema =
	z.object({
		mediaType:
			nonEmptyString,

		encoding:
			z.array(
				encodingSchema
			),

		strategy:
			nonEmptyString
				.optional()
	});


export const resourceDefinitionSchema =
	z.object({
		path:
			nonEmptyString,

		event:
			eventDefinitionSchema,

		'object-upload':
			objectUploadDefinitionSchema
				.optional()
	});


export const collectionDefinitionSchema =
	z.object({
		event:
			eventDefinitionSchema,

		resources:
			z.array(
				nonEmptyString
			)
			.default([]),

	collections:
			z.array(
				nonEmptyString
			)
			.default([])
	});


/** Selects all staged Resources for one definition, or one staged `key`. */
export const filesystemResourcePlacementDefinitionSchema =
	z.object({
		resource:
			nonEmptyString,

		key:
			nonEmptyString
				.optional()
	});


/** Places one already-built Collection Resource at a Filesystem location. */
export const filesystemCollectionPlacementDefinitionSchema =
	z.object({
		collection:
			nonEmptyString
	});


/** Groups Resource and Collection placements beneath one root-relative directory. */
export const filesystemDirectoryDefinitionSchema =
	z.object({
		path:
			z.string()
				.trim()
				.refine(
					isCanonicalFilesystemDirectoryPath,
					{
						message:
							'Filesystem directory path must be canonical.'
					}
				)
				.default(''),

		resources:
			z.record(
				nonEmptyString,
				filesystemResourcePlacementDefinitionSchema
			)
			.default({}),

		collections:
			z.record(
				nonEmptyString,
				filesystemCollectionPlacementDefinitionSchema
			)
			.default({})
	})
	.superRefine(
		(
			directory,
			context
		) => {
			const resourcePlacements =
				Object.keys(
					directory.resources
				);

			const collectionPlacements =
				Object.keys(
					directory.collections
				);


			if (
				resourcePlacements.length === 0 &&
				collectionPlacements.length === 0
			) {
				context.addIssue({
					code:
						'custom',

					message:
						'Filesystem directory must contain at least one Resource or Collection placement.'
				});
			}


			for (
				const placementName
				of resourcePlacements
			) {
				if (
					!isFilesystemPathSegment(
						placementName
					)
				) {
					context.addIssue({
						code:
							'custom',

						path: [
							'resources',
							placementName
						],

						message:
							`Invalid Filesystem placement name: ${placementName}`
					});
				}


				if (
					directory.collections[
						placementName
					] !== undefined
				) {
					context.addIssue({
						code:
							'custom',

						path: [
							'resources',
							placementName
						],

						message:
							`Filesystem placement name is used by both a Resource and Collection: ${placementName}`
					});
				}
			}


			for (
				const placementName
				of collectionPlacements
			) {
				if (
					!isFilesystemPathSegment(
						placementName
					)
				) {
					context.addIssue({
						code:
							'custom',

						path: [
							'collections',
							placementName
						],

						message:
							`Invalid Filesystem placement name: ${placementName}`
					});
				}
			}
		}
	);


/** Defines one Filesystem overlay Resource assembled after Resources and Collections. */
export const filesystemDefinitionSchema =
	z.object({
		root:
			nonEmptyString
				.refine(
					isCanonicalFilesystemPath,
					{
						message:
							'Filesystem root must be a canonical path.'
					}
				),

		event:
			eventDefinitionSchema,

		directories:
			z.array(
				filesystemDirectoryDefinitionSchema
			)
			.min(1)
	});


export const manifestSchema =
	z.object({
		version:
			z.literal(1),

		kind:
			z.number()
				.int()
				.nonnegative(),

		staging:
			z.object({
				path:
					nonEmptyString
			}),

		nostr:
			z.object({
				relays:
					z.array(
						nonEmptyString
					)
					.min(1)
			}),

		defaults:
			z.object({
				strategy:
					nonEmptyString
			})
			.optional(),

		strategies:
			z.record(
				nonEmptyString,
				blossomStrategyDefinitionSchema
			)
			.default({}),

		resources:
			z.record(
				nonEmptyString,
				resourceDefinitionSchema
			)
			.default({}),

		collections:
			z.record(
				nonEmptyString,
				collectionDefinitionSchema
			)
			.default({}),

		filesystems:
			z.record(
				nonEmptyString,
				filesystemDefinitionSchema
			)
			.default({})
	})
	.superRefine(
		(
			manifest,
			context
		) => {

			for (
				const [
					category,
					definitions
				]
				of [
					[
						'resources',
						manifest.resources
					],
					[
						'collections',
						manifest.collections
					],
					[
						'filesystems',
						manifest.filesystems
					]
				] as const
			) {
				for (
					const name
					of Object.keys(
						definitions
					)
				) {
					const error =
						getStagingLogicalNameError(
							name
						);


					if (
						error !==
							undefined
					) {
						context.addIssue({
							code:
								'custom',

							path: [
								category,
								name
							],

							message:
								error
						});
					}
				}
			}


			const defaultStrategy =
				manifest
					.defaults
					?.strategy;


			if (
				defaultStrategy !==
					undefined &&
				manifest
					.strategies[
						defaultStrategy
					] === undefined
			) {
				context.addIssue({
					code:
						'custom',

					path: [
						'defaults',
						'strategy'
					],

					message:
						`Unknown default strategy: ${defaultStrategy}`
				});
			}


			for (
				const [
					resourceName,
					resource
				]
				of Object.entries(
					manifest.resources
				)
			) {
				for (
					const message
					of validateResourceEventTags(
						resource.event.tags
					)
				) {
					context.addIssue({
						code:
							'custom',

						path: [
							'resources',
							resourceName,
							'event',
							'tags'
						],

						message
					});
				}


				const objectUpload =
					resource[
						'object-upload'
					];


				if (
					objectUpload ===
						undefined
				) {
					continue;
				}


				const strategyName =
					objectUpload.strategy ??
					defaultStrategy;


				if (
					strategyName ===
						undefined
				) {
					context.addIssue({
						code:
							'custom',

						path: [
							'resources',
							resourceName,
							'object-upload',
							'strategy'
						],

						message:
							'Object upload requires a strategy or defaults.strategy.'
					});

					continue;
				}


				if (
					manifest
						.strategies[
							strategyName
						] === undefined
				) {
					context.addIssue({
						code:
							'custom',

						path: [
							'resources',
							resourceName,
							'object-upload',
							'strategy'
						],

						message:
							`Unknown strategy: ${strategyName}`
					});
				}
			}


			for (
				const [
					collectionName,
					collection
				]
				of Object.entries(
					manifest.collections
				)
			) {
				for (
					const message
					of validateResourceEventTags(
						collection.event.tags
					)
				) {
					context.addIssue({
						code:
							'custom',

						path: [
							'collections',
							collectionName,
							'event',
							'tags'
						],

						message
					});
				}


				for (
					const resourceName
					of collection.resources
				) {
					const resource =
						manifest
							.resources[
								resourceName
							];


					if (
						resource ===
							undefined
					) {
						context.addIssue({
							code:
								'custom',

							path: [
								'collections',
								collectionName,
								'resources'
							],

							message:
								`Unknown Resource: ${resourceName}`
						});

						continue;
					}


					if (
						resource[
							'object-upload'
						] === undefined
					) {
						context.addIssue({
							code:
								'custom',

							path: [
								'collections',
								collectionName,
								'resources'
							],

							message:
								`Resource does not produce descriptors: ${resourceName}`
						});
					}
				}


				for (
					const childCollectionName
					of collection.collections
				) {
					if (
						manifest
							.collections[
								childCollectionName
							] === undefined
					) {
						context.addIssue({
							code:
								'custom',

							path: [
								'collections',
								collectionName,
								'collections'
							],

							message:
								`Unknown Collection: ${childCollectionName}`
						});
					}
				}
			}

			for (
				const [
					filesystemName,
					filesystem
				]
				of Object.entries(
					manifest.filesystems
				)
			) {
				for (
					const message
					of validateResourceEventTags(
						filesystem.event.tags
					)
				) {
					context.addIssue({
						code:
							'custom',

						path: [
							'filesystems',
							filesystemName,
							'event',
							'tags'
						],

						message
					});
				}


				for (
					const message
					of validateFilesystemEventTags(
						filesystem.event.tags
					)
				) {
					context.addIssue({
						code:
							'custom',

						path: [
							'filesystems',
							filesystemName,
							'event',
							'tags'
						],

						message
					});
				}


				for (
					const [
						directoryIndex,
						directory
					]
					of filesystem.directories.entries()
				) {
					for (
						const placement
						of Object.values(
							directory.resources
						)
					) {
						if (
							manifest.resources[
								placement.resource
							] === undefined
						) {
							context.addIssue({
								code:
									'custom',

								path: [
									'filesystems',
									filesystemName,
									'directories',
									directoryIndex,
									'resources'
								],

								message:
									`Unknown Resource: ${placement.resource}`
							});
						}
					}


					for (
						const placement
						of Object.values(
							directory.collections
						)
					) {
						if (
							manifest.collections[
								placement.collection
							] === undefined
						) {
							context.addIssue({
								code:
									'custom',

								path: [
									'filesystems',
									filesystemName,
									'directories',
									directoryIndex,
									'collections'
								],

								message:
									`Unknown Collection: ${placement.collection}`
							});
						}
					}
				}
			}

		}
	);


/**
 * Required generic Resource envelope.
 *
 * `t` classifies the Resource for the application; `dataType` + `dataVersion`
 * identify the payload schema. They are required separately so manifests cannot
 * accidentally use Resource Type as a substitute for semantic type.
 */
const RESOURCE_EVENT_REQUIRED_TAGS = [
	'd',
	'm',
	't',
	'dataType',
	'dataVersion',
	'representation'
] as const;


/**
 * Validates the generic Resource envelope without knowing Domain-specific tag
 * semantics. Non-envelope scalar tags are intentionally allowed as Resource
 * metadata.
 */
function validateResourceEventTags(
	tags:
		readonly (readonly string[])[]
): string[] {
	const messages:
		string[] = [];


	for (
		const tagName
		of RESOURCE_EVENT_REQUIRED_TAGS
	) {
		const matches =
			tags.filter(
				tag =>
					tag[0] ===
						tagName
			);


		if (
			matches.length !==
				1
		) {
			messages.push(
				`Resource event requires exactly one "${tagName}" tag.`
			);

			continue;
		}


		const value =
			matches[0]?.[1];


		if (
			value === undefined ||
			value.trim().length === 0
		) {
			messages.push(
				`Resource event has an invalid "${tagName}" tag.`
			);
		}
	}


	const dataVersion =
		tags.find(
			tag =>
				tag[0] ===
					'dataVersion'
		)?.[1];


	if (
		dataVersion !== undefined
	) {
		const parsed =
			Number(
				dataVersion
			);


		if (
			!Number.isSafeInteger(
				parsed
			) ||
			parsed < 1
		) {
			messages.push(
				'Resource event dataVersion must be a positive integer.'
			);
		}
	}


	const representation =
		tags.find(
			tag =>
				tag[0] ===
					'representation'
		)?.[1];


	if (
		representation !== undefined &&
		representation !== 'content' &&
		representation !== 'descriptors'
	) {
		messages.push(
			`Unsupported Resource representation: ${representation}`
		);
	}


	return messages;
}


/**
 * Validates the Resource envelope constraints owned by a Filesystem definition.
 *
 * The manifest `root` field is the single source of truth for `f`; the builder
 * derives that metadata tag later. Filesystem overlays otherwise remain ordinary
 * content Resources.
 */
function validateFilesystemEventTags(
	tags:
		readonly (readonly string[])[]
): string[] {
	const messages:
		string[] = [];


	if (
		tags.some(
			tag =>
				tag[0] ===
					FILESYSTEM_ROOT_METADATA_KEY
		)
	) {
		messages.push(
			'Filesystem event must not declare an "f" tag; filesystems.<name>.root supplies it.'
		);
	}


	validateFilesystemTagValue(
		tags,
		't',
		FILESYSTEM_RESOURCE_TYPE,
		messages
	);

	validateFilesystemTagValue(
		tags,
		'dataType',
		FILESYSTEM_ENTRIES_DATA_TYPE,
		messages
	);

	validateFilesystemTagValue(
		tags,
		'dataVersion',
		String(
			FILESYSTEM_ENTRIES_DATA_VERSION
		),
		messages
	);

	validateFilesystemTagValue(
		tags,
		'representation',
		'content',
		messages
	);


	return messages;
}


/**
 * Requires one already-present generic Resource tag to use the Filesystem value.
 *
 * Missing or duplicate tags are reported by `validateResourceEventTags`; this
 * helper avoids duplicating those generic errors.
 *
 * @param tags Resource event tags declared by the Filesystem manifest entry.
 * @param tagName Generic Resource tag whose Filesystem value is constrained.
 * @param expectedValue Required Filesystem value for the tag.
 * @param messages Validation errors accumulated for the Filesystem definition.
 */
function validateFilesystemTagValue(
	tags:
		readonly (readonly string[])[],
	tagName:
		string,
	expectedValue:
		string,
	messages:
		string[]
): void {
	const matches =
		tags.filter(
			tag =>
				tag[0] ===
					tagName
		);


	if (
		matches.length !== 1
	) {
		return;
	}


	const actualValue =
		matches[0]?.[1];


	if (
		actualValue !==
			expectedValue
	) {
		messages.push(
			`Filesystem event "${tagName}" tag must be "${expectedValue}".`
		);
	}
}


export type Manifest =
	z.infer<
		typeof manifestSchema
	>;


export type ResourceDefinition =
	z.infer<
		typeof resourceDefinitionSchema
	>;


export type EventDefinition =
	z.infer<
		typeof eventDefinitionSchema
	>;


export type ObjectUploadDefinition =
	z.infer<
		typeof objectUploadDefinitionSchema
	>;


export type CollectionDefinition =
	z.infer<
		typeof collectionDefinitionSchema
	>;


export type FilesystemDefinition =
	z.infer<
		typeof filesystemDefinitionSchema
	>;


export type FilesystemDirectoryDefinition =
	z.infer<
		typeof filesystemDirectoryDefinitionSchema
	>;


export type FilesystemResourcePlacementDefinition =
	z.infer<
		typeof filesystemResourcePlacementDefinitionSchema
	>;


export type FilesystemCollectionPlacementDefinition =
	z.infer<
		typeof filesystemCollectionPlacementDefinitionSchema
	>;


export type Encoding =
	z.infer<
		typeof encodingSchema
	>;


export function validateManifest(
	value:
		unknown
): Manifest {

	const result =
		manifestSchema.safeParse(
			value
		);


	if (
		result.success
	) {
		return result.data;
	}


	const details =
		result.error.issues
			.map(
				issue => {
					const path =
						issue.path
							.length > 0
							? issue.path.join(
								'.'
							)
							: 'manifest';


					return (
						`${path}: ` +
						issue.message
					);
				}
			)
			.join('\n');


	throw new Error(
		`Manifest validation failed:\n${details}`
	);
}