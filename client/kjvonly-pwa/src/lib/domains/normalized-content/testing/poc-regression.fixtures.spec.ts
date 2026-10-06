import {
	describe,
	expect,
	it
} from 'vitest';

import {
	NormalizedDocumentValidator
} from '../validation/normalized-document-validator';
import type {
	NormalizedBlock
} from '../models/normalized-block.model';
import type {
	NormalizedDocument
} from '../models/normalized-document.model';
import {
	POC_REGRESSION_FIXTURES
} from './poc-regression.fixtures';

const validator =
	new NormalizedDocumentValidator();

describe('normalized-content POC regression fixtures', () => {
	it('accepts every curated POC fixture as canonical NormalizedDocument data', () => {
		for (const fixture of POC_REGRESSION_FIXTURES) {
			expect(
				validator.validate(fixture)
			).toEqual(fixture);
		}
	});

	it('keeps legacy block.text out of all curated fixtures', () => {
		for (const fixture of POC_REGRESSION_FIXTURES) {
			expect(
				containsLegacyBlockText(fixture.blocks)
			).toBe(false);
		}
	});

	it('uses typed Bible location references instead of POC /kjv/... links', () => {
		const hrefs = collectHrefs(
			POC_REGRESSION_FIXTURES
		);

		expect(hrefs).toContain(
			'bibleLocationReference:1_31_42'
		);
		expect(hrefs).toContain(
			'bibleLocationReference:22_35_10'
		);
		expect(hrefs).toContain('#fnt1');
		expect(
			hrefs.some(
				(href) =>
					href.startsWith('/kjv/') ||
					href.includes('/s_')
			)
		).toBe(false);
	});

	it('retains recursive list structure from the POC corpus', () => {
		const depths = POC_REGRESSION_FIXTURES.map(
			(fixture) =>
				maxBlockDepth(
					fixture.blocks
				)
		);

		expect(
			Math.max(...depths)
		).toBeGreaterThanOrEqual(4);
	});
});

function containsLegacyBlockText(
	blocks: readonly NormalizedBlock[]
): boolean {
	return blocks.some(
		(block) =>
			Object.prototype.hasOwnProperty.call(
				block,
				'text'
			) ||
			containsLegacyBlockText(
				block.blocks ?? []
			)
	);
}

function collectHrefs(
	documents: readonly NormalizedDocument[]
): string[] {
	const hrefs: string[] = [];

	for (const document of documents) {
		visitBlocks(
			document.blocks,
			(block) => {
				for (const content of block.content ?? []) {
					if (
						content.type === 'word'
					) {
						hrefs.push(
							...(content.href ?? [])
						);
					}
				}
			}
		);
	}

	return hrefs;
}

function maxBlockDepth(
	blocks: readonly NormalizedBlock[],
	depth = 1
): number {
	return blocks.reduce(
		(maxDepth, block) =>
			Math.max(
				maxDepth,
				block.blocks?.length
					? maxBlockDepth(
						block.blocks,
						depth + 1
					)
					: depth
			),
		depth
	);
}

function visitBlocks(
	blocks: readonly NormalizedBlock[],
	visit: (block: NormalizedBlock) => void
): void {
	for (const block of blocks) {
		visit(block);
		visitBlocks(
			block.blocks ?? [],
			visit
		);
	}
}
