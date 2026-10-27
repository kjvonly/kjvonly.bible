import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	ResourceResolutionStrategy
} from './resource-resolution-strategy';

import {
	ResourceResolutionStrategyRegistry
} from './resource-resolution-strategy-registry';

describe(
	'ResourceResolutionStrategyRegistry',
	() => {
		it(
			'returns a registered strategy by type',
			() => {
				const blossom =
					createStrategy(
						'blossom'
					);

				const registry =
					new ResourceResolutionStrategyRegistry([
						blossom
					]);

				expect(
					registry.get(
						'blossom'
					)
				).toBe(
					blossom
				);
			}
		);

		it(
			'returns undefined for an unregistered strategy type',
			() => {
				const registry =
					new ResourceResolutionStrategyRegistry([]);

				expect(
					registry.get(
						'ipfs'
					)
				).toBeUndefined();
			}
		);

		it(
			'rejects duplicate strategy types',
			() => {
				const strategyA =
					createStrategy(
						'blossom'
					);

				const strategyB =
					createStrategy(
						'blossom'
					);

				expect(
					() =>
						new ResourceResolutionStrategyRegistry([
							strategyA,
							strategyB
						])
				).toThrow(
					'Duplicate Resource resolution strategy: blossom'
				);
			}
		);
	}
);

function createStrategy(
	type: string
): ResourceResolutionStrategy {
	return {
		type,

		resolve:
			async () =>
				new Uint8Array()
	};
}
