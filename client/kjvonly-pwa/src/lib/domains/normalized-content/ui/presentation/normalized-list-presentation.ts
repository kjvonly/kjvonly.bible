import type {
	NormalizedBlock
} from '@kjvonly/normalized-content';

export function resolveNormalizedListMarkerClass(
	block: NormalizedBlock
): string | undefined {
	if (
		block.type !==
			'list'
	) {
		return undefined;
	}

	if (
		block.class?.includes(
			'list-roman'
		)
	) {
		return 'list-[upper-roman]';
	}

	if (
		block.class?.includes(
			'list-arabic'
		)
	) {
		return 'list-decimal';
	}

	return block.ordered
		? 'list-decimal'
		: 'list-disc';
}
