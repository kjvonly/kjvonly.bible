import {
	describe,
	expect,
	it
} from 'vitest';

import {
	DeterministicNormalizedBlockIdGenerator
} from './deterministic-normalized-block-id-generator.js';

describe(
	'DeterministicNormalizedBlockIdGenerator',
	() => {
		it(
			'preserves an explicit source id verbatim',
			() => {
				const generator =
					new DeterministicNormalizedBlockIdGenerator();

				expect(
					generator.createId(
						'paragraph',
						'source-paragraph'
					)
				).toBe(
					'source-paragraph'
				);
			}
		);

		it(
			'assigns versioned per-type ordinal ids',
			() => {
				const generator =
					new DeterministicNormalizedBlockIdGenerator();

				expect(
					generator.createId(
						'paragraph'
					)
				).toBe(
					'nd-v1-paragraph-1'
				);

				expect(
					generator.createId(
						'paragraph'
					)
				).toBe(
					'nd-v1-paragraph-2'
				);
			}
		);

		it(
			'keeps independent counters for different block types',
			() => {
				const generator =
					new DeterministicNormalizedBlockIdGenerator();

				expect(
					generator.createId(
						'paragraph'
					)
				).toBe(
					'nd-v1-paragraph-1'
				);

				expect(
					generator.createId(
						'heading'
					)
				).toBe(
					'nd-v1-heading-1'
				);

				expect(
					generator.createId(
						'paragraph'
					)
				).toBe(
					'nd-v1-paragraph-2'
				);
			}
		);

		it(
			'depends only on block type and traversal order',
			() => {
				expect(
					generatedId(
						'paragraph'
					)
				).toBe(
					generatedId(
						'paragraph'
					)
				);
			}
		);

		it(
			'does not advance a generated counter when preserving a source id',
			() => {
				const generator =
					new DeterministicNormalizedBlockIdGenerator();

				generator.createId(
					'paragraph',
					'source-paragraph'
				);

				expect(
					generator.createId(
						'paragraph'
					)
				).toBe(
					'nd-v1-paragraph-1'
				);
			}
		);

		it(
			'skips generated ordinals reserved by source html',
			() => {
				const generator =
					new DeterministicNormalizedBlockIdGenerator();

				generator.reserveSourceIds([
					'nd-v1-paragraph-1',
					'nd-v1-paragraph-2'
				]);

				expect(
					generator.createId(
						'paragraph'
					)
				).toBe(
					'nd-v1-paragraph-3'
				);

				expect(
					generator.createId(
						'paragraph'
					)
				).toBe(
					'nd-v1-paragraph-4'
				);
			}
		);

		it(
			'rejects duplicate source ids before generated identity is assigned',
			() => {
				const generator =
					new DeterministicNormalizedBlockIdGenerator();

				expect(
					() =>
						generator.reserveSourceIds([
							'duplicate',
							'duplicate'
						])
				).toThrow(
					'Duplicate HTML id: duplicate'
				);
			}
		);
	}
);

function generatedId(
	type: 'paragraph'
): string {
	return new DeterministicNormalizedBlockIdGenerator()
		.createId(
			type
		);
}
