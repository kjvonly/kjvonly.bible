import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	ResourceResolutionStrategyRegistry
} from './resource-resolution-strategy-registry';


/**
 * Resolves serialized bytes for one validated Resource descriptor.
 *
 * Provider selection is delegated to the strategy registry and byte retrieval
 * is delegated to the selected ResourceResolutionStrategy.
 */
export class ResourceDescriptorContentResolver {
	constructor(
		private readonly strategyRegistry:
			Pick<
				ResourceResolutionStrategyRegistry,
				'get'
			>
	) {}

	/**
	 * Resolves the descriptor through its registered strategy.
	 */
	async resolve(
		descriptor:
			ResourceDescriptor
	): Promise<
		Uint8Array
	> {
		const strategy =
			this.strategyRegistry.get(
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

		return strategy.resolve(
			descriptor
		);
	}
}
