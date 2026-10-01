import type {
	ResourceResolutionStrategy
} from './resource-resolution-strategy';

/**
 * Owns Resource resolution strategy registration and lookup by strategy type.
 *
 * Duplicate strategy types are rejected during composition so descriptor
 * resolution can perform deterministic provider selection.
 */
export class ResourceResolutionStrategyRegistry {

	private readonly strategies:
		ReadonlyMap<
			string,
			ResourceResolutionStrategy
		>;

	constructor(
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

	/**
	 * Returns the strategy registered for the descriptor strategy type.
	 */
	get(
		type: string
	): ResourceResolutionStrategy |
		undefined {
		return this.strategies.get(
			type
		);
	}
}
