import type {
	NormalizedBlock,
	NormalizedHeadingLevel
} from '@kjvonly/normalized-content';

export type NormalizedBlockElement =
	| 'blockquote'
	| 'caption'
	| 'figcaption'
	| 'figure'
	| 'h1'
	| 'h2'
	| 'h3'
	| 'h4'
	| 'h5'
	| 'h6'
	| 'hr'
	| 'li'
	| 'ol'
	| 'p'
	| 'pre'
	| 'span'
	| 'table'
	| 'td'
	| 'th'
	| 'tr'
	| 'ul';

/**
 * Identifies which canonical child payload a block presentation renders.
 * `none` is used by structural nodes that intentionally own no child content.
 */
export type NormalizedBlockContentKind =
	| 'content'
	| 'blocks'
	| 'none';

/** Structural context supplied by the recursive renderer for contextual nodes. */
export interface NormalizedBlockPresentationContext {
	/** Canonical type of the block that directly owns the candidate block. */
	parentType?: NormalizedBlock['type'];
}

/** Semantic DOM presentation owned by the normalized-content UI layer. */
export interface NormalizedBlockPresentation {
	element: NormalizedBlockElement;
	classes?: string;
	contentKind: NormalizedBlockContentKind;
}

const HEADING_PRESENTATIONS: Readonly<
	Record<
		NormalizedHeadingLevel,
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

/**
 * Resolves one canonical normalized block into explicit semantic DOM presentation.
 *
 * The discriminated-union switch is intentionally exhaustive. When the shared
 * NormalizedDocument contract adds a block type, this renderer must make an
 * explicit presentation decision before the PWA compiles against that contract.
 * Context-only structures also require their owning parent so their DOM semantics
 * cannot be guessed or flattened into a generic element.
 *
 * @param block Canonical normalized block to present.
 * @param context Direct structural parent supplied by recursive rendering.
 * @returns Semantic element, application presentation classes, and child payload kind.
 */
export function resolveNormalizedBlockPresentation(
	block: NormalizedBlock,
	context: NormalizedBlockPresentationContext = {}
): NormalizedBlockPresentation {
	switch (block.type) {
		case 'heading':
			return HEADING_PRESENTATIONS[
				block.level
			];

		case 'paragraph':
			return {
				element: 'p',
				classes: 'my-4',
				contentKind: 'content'
			};

		case 'text':
			return {
				element: 'span',
				contentKind: 'content'
			};

		case 'preformatted':
			return {
				element: 'pre',
				classes: 'my-4 overflow-x-auto',
				contentKind: 'content'
			};

		case 'thematic-break':
			return {
				element: 'hr',
				classes: 'my-6',
				contentKind: 'none'
			};

		case 'quote':
			return {
				element: 'blockquote',
				classes: 'my-6 border-l-2 border-neutral-400 pl-4',
				contentKind: 'blocks'
			};

		case 'list':
			return {
				element: block.ordered
					? 'ol'
					: 'ul',
				classes: 'my-4 pl-6',
				contentKind: 'blocks'
			};

		case 'list-item':
			return {
				element: 'li',
				classes: 'my-2',
				contentKind: 'blocks'
			};

		case 'figure':
			return {
				element: 'figure',
				classes: 'my-6',
				contentKind: 'blocks'
			};

		case 'caption':
			return resolveNormalizedCaptionPresentation(
				context
			);

		case 'table':
			return {
				element: 'table',
				classes: 'my-6 w-full',
				contentKind: 'blocks'
			};

		case 'table-row':
			requireNormalizedParent(
				block.type,
				context.parentType,
				'table'
			);

			return {
				element: 'tr',
				contentKind: 'blocks'
			};

		case 'table-cell':
			requireNormalizedParent(
				block.type,
				context.parentType,
				'table-row'
			);

			return {
				element: block.header
					? 'th'
					: 'td',
				classes: 'p-2 align-top',
				contentKind: 'blocks'
			};

		default:
			return assertUnsupportedNormalizedBlock(
				block
			);
	}
}

/**
 * Resolves a contextual caption according to the canonical structure that owns it.
 *
 * @param context Direct structural parent supplied by recursive rendering.
 * @returns Figure or table caption presentation.
 */
function resolveNormalizedCaptionPresentation(
	context: NormalizedBlockPresentationContext
): NormalizedBlockPresentation {
	switch (context.parentType) {
		case 'figure':
			return {
				element: 'figcaption',
				classes: 'mt-2 text-sm',
				contentKind: 'blocks'
			};

		case 'table':
			return {
				element: 'caption',
				classes: 'mb-2 text-sm',
				contentKind: 'blocks'
			};

		default:
			throw new Error(
				`Unsupported normalized caption parent: ${context.parentType ?? 'root'}`
			);
	}
}

/**
 * Requires one context-only normalized block to be rendered beneath its
 * canonical structural owner. Runtime validation should already guarantee this
 * grammar; this guard keeps direct renderer use from silently inventing DOM.
 *
 * @param blockType Context-only canonical block type being rendered.
 * @param actualParentType Structural parent received from the recursive renderer.
 * @param expectedParentType Canonical structural owner required by the model.
 */
function requireNormalizedParent(
	blockType: NormalizedBlock['type'],
	actualParentType: NormalizedBlock['type'] | undefined,
	expectedParentType: NormalizedBlock['type']
): void {
	if (
		actualParentType ===
		expectedParentType
	) {
		return;
	}

	throw new Error(
		`Unsupported normalized ${blockType} parent: ${actualParentType ?? 'root'}`
	);
}

/**
 * Compile-time exhaustiveness guard for the shared normalized block union.
 * Runtime invocation is possible only when unvalidated data bypasses the shared
 * NormalizedDocument validator.
 */
function assertUnsupportedNormalizedBlock(
	block: never
): never {
	throw new Error(
		`Unsupported normalized block type: ${(block as { type?: unknown }).type ?? 'missing'}`
	);
}
