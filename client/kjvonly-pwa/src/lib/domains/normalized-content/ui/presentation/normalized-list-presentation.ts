import type {
	NormalizedBlock
} from '../../models/normalized-block.model';

const SOURCE_MARKER_CLASSES =
	new Set([
		'list-marker',
		'list-marker-roman',
		'list-marker-arabic'
	]);

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
		hasSourceProvidedMarkers(
			block
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

function hasSourceProvidedMarkers(
	block: NormalizedBlock
): boolean {
	const listItems =
		block.blocks ?? [];

	return (
		listItems.length >
			0 &&
		listItems.every(
			(item) =>
				(item.blocks ?? []).some(
					(child) =>
						(child.class ?? []).some(
							(className) =>
								SOURCE_MARKER_CLASSES.has(
									className
								)
						)
				)
		)
	);
}
