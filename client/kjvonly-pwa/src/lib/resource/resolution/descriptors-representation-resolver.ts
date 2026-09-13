import type {
	ResolvedResourceRepresentation,
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
			ResolvedResourceRepresentation
	): Promise<
		ResourceResolutionResult
	> {
		return this.resolveRepresentation(
			resource,
			new Set([
				this.createResourceIdentity(
					resource
				)
			])
		);
	}

	private async resolveRepresentation(
		resource:
			ResolvedResourceRepresentation,

		visited:
			ReadonlySet<string>
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

				const resolved =
					await strategy.resolve(
						descriptor
					);

				this.assertMatchesDescriptor(
					descriptor,
					resolved
				);

				if (
					resolved.representation ===
					'descriptors'
				) {
					const identity =
						this.createResourceIdentity(
							resolved
						);

					if (
						visited.has(
							identity
						)
					) {
						throw new Error(
							`Recursive Resource descriptor cycle: ${resolved.publisher}/${resolved.resourceId}`
						);
					}

					const nestedVisited =
						new Set(
							visited
						);

					nestedVisited.add(
						identity
					);

					const nested =
						await this.resolveRepresentation(
							resolved,
							nestedVisited
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

				contents.push({
					publisher:
						resolved.publisher,

					resourceId:
						resolved.resourceId,

					resourceType:
						resolved.resourceType,

					modifiedAt:
						resolved.modifiedAt,

					mediaType:
						resolved.mediaType,

					content:
						resolved.payload
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

	private assertMatchesDescriptor(
		descriptor:
			ResourceDescriptor,

		resolved:
			ResolvedResourceRepresentation
	): void {

		if (
			resolved.publisher !==
				descriptor.metadata.publisher ||
			resolved.resourceId !==
				descriptor.metadata.resourceId ||
			resolved.resourceType !==
				descriptor.metadata.category ||
			resolved.modifiedAt !==
				descriptor.metadata.modifiedAt ||
			resolved.mediaType !==
				descriptor.metadata.mediaType
		) {
			throw new Error(
				'Resolved Resource does not match its descriptor.'
			);
		}
	}

	private createResourceIdentity(
		resource:
			Pick<
				ResolvedResourceRepresentation,
				'publisher' |
				'resourceId'
			>
	): string {
		return JSON.stringify([
			resource.publisher,
			resource.resourceId
		]);
	}
}
