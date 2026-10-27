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

	// Unordered lists with a numbering hint keep their literal number tokens.
	// They must not receive a second marker from CSS. Ordinary unordered
	// lists without that hint continue to display their normal bullets.
	if (
		!block.ordered &&
		(
			block.class?.includes('list-roman') ||
			block.class?.includes('list-arabic')
		)
	) {
		return 'list-none';
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
