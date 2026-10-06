import type {
	NormalizedBlock
} from '../../models/normalized-block.model';

export type NormalizedBlockElement =
	| 'blockquote'
	| 'h1'
	| 'h2'
	| 'h3'
	| 'h4'
	| 'h5'
	| 'h6'
	| 'li'
	| 'ol'
	| 'p'
	| 'span'
	| 'ul';

export type NormalizedBlockContentKind =
	| 'content'
	| 'blocks';

export interface NormalizedBlockPresentation {
	element: NormalizedBlockElement;
	classes?: string;
	contentKind: NormalizedBlockContentKind;
}

const HEADING_PRESENTATIONS: Readonly<
	Record<
		number,
		NormalizedBlockPresentation
	>
> = {
	1: {
		element: 'h1',
		classes: 'my-6 text-xl',
		contentKind: 'content'
	},
	2: {
		element: 'h2',
		classes: 'my-5 text-lg',
		contentKind: 'content'
	},
	3: {
		element: 'h3',
		classes: 'my-5 text-base',
		contentKind: 'content'
	},
	4: {
		element: 'h4',
		classes: 'my-4 text-base',
		contentKind: 'content'
	},
	5: {
		element: 'h5',
		classes: 'my-4 text-sm',
		contentKind: 'content'
	},
	6: {
		element: 'h6',
		classes: 'my-4 text-sm',
		contentKind: 'content'
	}
};

const BLOCK_PRESENTATIONS: Readonly<
	Record<
		string,
		NormalizedBlockPresentation
	>
> = {
	paragraph: {
		element: 'p',
		classes: 'my-4',
		contentKind: 'content'
	},
	text: {
		element: 'span',
		contentKind: 'content'
	},
	quote: {
		element: 'blockquote',
		classes: 'my-6 border-l-2 border-neutral-400 pl-4',
		contentKind: 'blocks'
	},
	'list-item': {
		element: 'li',
		classes: 'my-2',
		contentKind: 'blocks'
	}
};

export function resolveNormalizedBlockPresentation(
	block: NormalizedBlock
): NormalizedBlockPresentation {
	if (
		block.type ===
			'heading'
	) {
		const presentation =
			HEADING_PRESENTATIONS[
				block.level ?? -1
			];

		if (!presentation) {
			throw new Error(
				`Unsupported normalized heading level: ${block.level ?? 'missing'}`
			);
		}

		return presentation;
	}

	if (
		block.type ===
			'list'
	) {
		return {
			element:
				block.ordered
					? 'ol'
					: 'ul',
			classes:
				'my-4 pl-6',
			contentKind:
				'blocks'
		};
	}

	const presentation =
		BLOCK_PRESENTATIONS[
			block.type
		];

	if (!presentation) {
		throw new Error(
			`Unsupported normalized block type: ${block.type}`
		);
	}

	return presentation;
}
