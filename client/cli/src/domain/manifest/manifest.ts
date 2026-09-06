import {
	z
} from 'zod';


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
			.default({})
	})
	.superRefine(
		(
			manifest,
			context
		) => {

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
			}
		}
	);


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