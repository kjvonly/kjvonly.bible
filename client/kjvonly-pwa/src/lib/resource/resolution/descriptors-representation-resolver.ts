import type {
	ResourceRepresentation,
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceDescriptorDocumentDecoder
} from '$lib/resource/descriptors/resource-descriptor-document-decoder';

import type {
	ResourceDescriptorValidator
} from '$lib/resource/descriptors/resource-descriptor-validator';

import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	ResourceReceiptService
} from '$lib/resource/receipts/resource-receipt.service';

import type {
	ResourceRepresentationResolver
} from './resource-representation-resolver';

import type {
	ResourceResolutionCurrent,
	ResourceResolutionFailure,
	ResourceResolutionResult
} from './resource-resolution-result';

import type {
	ResourceResolutionStrategy
} from './resource-resolution-strategy';

const MAX_DESCRIPTOR_NESTING_DEPTH =
	3;

interface DescriptorResolutionContext {
	readonly depth:
		number;

	readonly visited:
		ReadonlySet<string>;
}

export class DescriptorsRepresentationResolver
	implements ResourceRepresentationResolver {

	readonly representation =
		'descriptors' as const;

	private readonly strategies:
		ReadonlyMap<
			string,
			ResourceResolutionStrategy
		>;

	constructor(
		private readonly documentDecoder:
			Pick<
				ResourceDescriptorDocumentDecoder,
				'decode'
			>,

		private readonly descriptorValidator:
			Pick<
				ResourceDescriptorValidator,
				'validate'
			>,

		private readonly receiptService:
			Pick<
				ResourceReceiptService,
				'needsProcessing'
			>,

		strategies:
			readonly ResourceResolutionStrategy[]
	) {
		const strategyMap =
			new Map<
				string,
				ResourceResolutionStrategy
			>();

		for (
			const strategy
			of strategies
		) {
			if (
				strategyMap.has(
					strategy.type
				)
			) {
				throw new Error(
					`Duplicate Resource resolution strategy: ${strategy.type}`
				);
			}

			strategyMap.set(
				strategy.type,
				strategy
			);
		}

		this.strategies =
			strategyMap;
	}

	async resolve(
		resource:
			ResourceRepresentation
	): Promise<
		ResourceResolutionResult
	> {
		let entries:
			readonly unknown[];

		try {
			entries =
				await this.documentDecoder.decode(
					resource.mediaType,
					resource.payload
				);
		} catch (error) {
			return {
				contents:
					[],

				current:
					[],

				failures: [
					{
						publisher:
							resource.publisher,

						resourceId:
							resource.resourceId,

						resourceType:
							resource.resourceType,

						error
					}
				]
			};
		}

		return this.resolveEntries(
			entries,
			{
				depth:
					0,

				visited:
					new Set([
						createResourceIdentity(
							resource.publisher,
							resource.resourceId
						)
					])
			}
		);
	}

	private async resolveEntries(
		entries:
			readonly unknown[],

		context:
			DescriptorResolutionContext
	): Promise<
		ResourceResolutionResult
	> {
		const contents:
			VerifiedResourceContent[] =
				[];

		const current:
			ResourceResolutionCurrent[] =
				[];

		const failures:
			ResourceResolutionFailure[] =
				[];

		for (
			const entry
			of entries
		) {
			let descriptor:
				ResourceDescriptor |
				undefined;

			try {
				descriptor =
					this.descriptorValidator.validate(
						entry
					);

				const shouldProcess =
					await this.receiptService.needsProcessing(
						descriptor.metadata.publisher,
						descriptor.metadata.resourceId,
						descriptor.metadata.modifiedAt
					);

				if (!shouldProcess) {
					current.push({
						publisher:
							descriptor.metadata.publisher,

						resourceId:
							descriptor.metadata.resourceId,

						resourceType:
							descriptor.metadata.category
					});

					continue;
				}

				const strategy =
					this.strategies.get(
						descriptor.strategy.type
					);

				if (
					strategy ===
					undefined
				) {
					throw new Error(
						`Unsupported Resource resolution strategy: ${descriptor.strategy.type}`
					);
				}

				if (
					descriptor.metadata.representation ===
					'descriptors'
				) {
					const identity =
						createResourceIdentity(
							descriptor.metadata.publisher,
							descriptor.metadata.resourceId
						);

					if (
						context.visited.has(
							identity
						)
					) {
						throw new Error(
							`Resource descriptor cycle: ${descriptor.metadata.publisher}/${descriptor.metadata.resourceId}`
						);
					}

					if (
						context.depth >=
						MAX_DESCRIPTOR_NESTING_DEPTH
					) {
						throw new Error(
							`Maximum Resource descriptor nesting depth exceeded: ${MAX_DESCRIPTOR_NESTING_DEPTH}`
						);
					}

					const content =
						await strategy.resolve(
							descriptor
						);

					const nestedEntries =
						await this.documentDecoder.decode(
							descriptor.metadata.mediaType,
							content
						);

					const visited =
						new Set(
							context.visited
						);

					visited.add(
						identity
					);

					const nested =
						await this.resolveEntries(
							nestedEntries,
							{
								depth:
									context.depth +
									1,

								visited
							}
						);

					contents.push(
						...nested.contents
					);

					current.push(
						...nested.current
					);

					failures.push(
						...nested.failures
					);

					continue;
				}

				const content =
					await strategy.resolve(
						descriptor
					);

				contents.push({
					publisher:
						descriptor.metadata.publisher,

					resourceId:
						descriptor.metadata.resourceId,

					resourceType:
						descriptor.metadata.category,

					modifiedAt:
						descriptor.metadata.modifiedAt,

					mediaType:
						descriptor.metadata.mediaType,

					content
				});
			} catch (error) {
				if (
					descriptor ===
					undefined
				) {
					failures.push({
						error
					});

					continue;
				}

				failures.push({
					publisher:
						descriptor.metadata.publisher,

					resourceId:
						descriptor.metadata.resourceId,

					resourceType:
						descriptor.metadata.category,

					error
				});
			}
		}

		return {
			contents,
			current,
			failures
		};
	}
}

function createResourceIdentity(
	publisher:
		string,

	resourceId:
		string
): string {
	return JSON.stringify([
		publisher,
		resourceId
	]);
}
