import type {
	AnyNode,
	Element
} from 'domhandler';

import type {
	NormalizedBlock
} from '@kjvonly/normalized-content';

import type {
	NormalizedContent
} from '@kjvonly/normalized-content';

import type {
	NormalizedDocument
} from '@kjvonly/normalized-content';

import type {
	ParseResult
} from '../../diagnostics/parse-diagnostics.js';

import type {
	ParsedHtmlDocument
} from '../parser/html-parser.js';

import type {
	NormalizedDocumentValidator
} from '@kjvonly/normalized-content';

import type {
	DeterministicNormalizedBlockIdGenerator
} from '../identity/deterministic-normalized-block-id-generator.js';

import type {
	HtmlBlockProcessorContext,
	NormalizedBlockCreationInput
} from '../context/html-block-processor-context.js';

import {
	HtmlBlockProcessorRegistry
} from '../registry/html-block-processor-registry.js';

import {
	HtmlInlineParser
} from '../inline/html-inline-parser.js';

import {
	createHtmlInlineState,
	type HtmlInlineState
} from '../inline/html-inline-state.js';

import {
	isIntentionallyIgnoredHtmlElement,
	isTransparentHtmlElement,
	preservesHtmlElementSourceIdentity,
	type HtmlElementSupportLookup
} from '../semantics/html-element-semantic-policy.js';

import {
	hasMeaningfulInlineContent
} from '../inline/has-meaningful-inline-content.js';

import {
	requireNormalizedFlowBlocks
} from '../processors/normalized-block-type-guards.js';

import {
	projectNormalizedClasses
} from '../projection/html-normalized-class-projector.js';

import {
	createHtmlParseDiagnostics
} from '../diagnostics/html-parse-diagnostics.js';

/**
 * Controls source-root selection and optional provenance for one HTML conversion.
 */
export interface HtmlNormalizedDocumentConversionOptions {
	/** Optional selector limiting conversion to the first matching source subtree. */
	rootSelector?: string;

	/** Optional logical provenance persisted on the accepted document. */
	source?: string;
}

/**
 * Converts source HTML into the current canonical NormalizedDocument contract.
 *
 * The converter owns source interpretation only: it walks the selected HTML root,
 * delegates structural elements to block processors, parses inline semantics,
 * assigns stable block IDs, and validates the resulting document. It does not own
 * filesystem traversal, Resource publication, or rendering.
 */
export class HtmlNormalizedDocumentConverter {
	constructor(
		private readonly validator:
			NormalizedDocumentValidator,
		private readonly blockProcessorRegistry:
			HtmlBlockProcessorRegistry,
		private readonly inlineParser:
			HtmlInlineParser,
		private readonly createBlockIdGenerator:
			() => DeterministicNormalizedBlockIdGenerator
	) {}

	/**
	 * Converts one parsed HTML document into a validated NormalizedDocument.
	 *
	 * When rootSelector is provided, the first matching element becomes an extraction
	 * boundary: its children are converted, while metadata on the boundary itself is
	 * intentionally outside the normalized document. Otherwise body is the boundary.
	 */
	convert(
		parsedDocument: ParsedHtmlDocument,
		options:
			HtmlNormalizedDocumentConversionOptions = {}
	): NormalizedDocument {
		return this.convertWithDiagnostics(
			parsedDocument,
			options
		).document;
	}

	/**
	 * Converts one parsed HTML document and returns import-only diagnostics
	 * alongside the accepted document. Diagnostics never become persisted content.
	 */
	convertWithDiagnostics(
		parsedDocument: ParsedHtmlDocument,
		options:
			HtmlNormalizedDocumentConversionOptions = {}
	): ParseResult {
		const rootSelector =
			options.rootSelector ??
				'body';

		const rootElement =
			parsedDocument.selectFirst(
				rootSelector
			);

		if (!rootElement) {
			throw new Error(
				options.rootSelector
					? `HTML root not found: ${options.rootSelector}`
					: 'HTML body root not found.'
			);
		}

		const idGenerator =
			this.createBlockIdGenerator();

		const elementSupport:
			HtmlElementSupportLookup = {
			hasBlockProcessor:
				tag =>
					this.blockProcessorRegistry.has(
						tag
					),
			hasInlineProcessor:
				tag =>
					this.inlineParser.hasProcessor(
						tag
					),
			preservesBlockSourceIdentity:
				tag =>
					this.blockProcessorRegistry.preservesSourceIdentity(
						tag
					)
		};

		// The selected element is an extraction boundary, not normalized content.
		// Reserve only descendant IDs whose element boundary can survive conversion;
		// unsupported/ignored source IDs must not perturb generated block ordinals.
		idGenerator.reserveSourceIds(
			collectPreservableDescendantElementIds(
				rootElement,
				elementSupport
			)
		);

		const blocks =
			requireNormalizedFlowBlocks(
				parseBlockChildren(
					rootElement,
					this.blockProcessorRegistry,
					this.inlineParser,
					idGenerator,
					createHtmlInlineState()
				),
				'HTML document root'
			);

		const candidate:
			{
				blocks: NormalizedDocument['blocks'];
				source?: string;
			} = {
				blocks
			};

		if (
			options.source !==
				undefined
		) {
			candidate.source =
				options.source;
		}

		const document =
			this.validator.validate(
				candidate
			);

		return {
			document,
			diagnostics:
				createHtmlParseDiagnostics(
					rootElement,
					document,
					elementSupport
				)
		};
	}
}

/**
 * Walks a structural element in source order and projects all descendants into
 * normalized blocks. Consecutive inline nodes are collected into synthetic text
 * blocks so inline/block ordering survives recursive traversal.
 */
function parseBlockChildren(
	parent: Element,
	registry: HtmlBlockProcessorRegistry,
	inlineParser: HtmlInlineParser,
	idGenerator: DeterministicNormalizedBlockIdGenerator,
	inheritedInlineState: HtmlInlineState,
	leadingInlineContent: readonly NormalizedContent[] = []
): NormalizedBlock[] {
	const blocks:
		NormalizedBlock[] = [];

	const context =
		createBlockProcessorContext(
			registry,
			inlineParser,
			idGenerator,
			inheritedInlineState
		);

	let inlineNodes:
		AnyNode[] = [];

	let pendingInlineContent:
		NormalizedContent[] = [
			...leadingInlineContent
		];

	const flushInlineNodes =
		(): void => {
			if (
				inlineNodes.length ===
					0 &&
				pendingInlineContent.length ===
					0
			) {
				return;
			}

			const parsedContent =
				inlineNodes.length >
					0
					? inlineParser.parseNodes(
						inlineNodes,
						{},
						inheritedInlineState
					)
					: [];

			const content:
				NormalizedContent[] = [
					...pendingInlineContent,
					...parsedContent
				];

			inlineNodes =
				[];
			pendingInlineContent =
				[];

			if (
				!hasMeaningfulInlineContent(
					content
				)
			) {
				return;
			}

			blocks.push(
				context.createBlock(
					undefined,
					{
						type:
							'text',
						content
					}
				)
			);
		};

	// Walk source-order siblings once. Registered structural processors may
	// recursively re-enter parseBlockChildren through the shared processor context.
	for (
		const child of parent.children
	) {
		if (
			isIgnorableNode(
				child
			)
		) {
			continue;
		}

		if (
			isElement(
				child
			) &&
			isIgnoredTag(
				child.name.toLowerCase()
			)
		) {
			continue;
		}

		if (
			isElement(
				child
			) &&
			registry.has(
				child.name.toLowerCase()
			)
		) {
			flushInlineNodes();

			blocks.push(
				...registry.process(
					child,
					context
				)
			);
			continue;
		}

		if (
			isElement(
				child
			) &&
			hasRegisteredStructuralDescendant(
				child,
				registry
			)
		) {
			flushInlineNodes();

			const tag =
				child.name.toLowerCase();

			const descendantInlineContext =
				(
					inlineParser.hasProcessor(
						tag
					) ||
					isTransparentHtmlElement(
						tag
					)
				)
					? inlineParser.createDescendantInlineContext(
						child,
						inheritedInlineState
					)
					: {
						state:
							inheritedInlineState,
						leadingContent:
							[]
					};

			// Wrappers containing real structural content stay in block traversal.
			// Supported/neutral inline boundaries first contribute any zero-width
			// anchor at their opening position and decorate descendant inline state.
			blocks.push(
				...parseBlockChildren(
					child,
					registry,
					inlineParser,
					idGenerator,
					descendantInlineContext.state,
					descendantInlineContext.leadingContent
				)
			);

			continue;
		}

		inlineNodes.push(
			child
		);
	}

	flushInlineNodes();

	return blocks;
}

/** Creates processor capabilities scoped to one inherited inline-semantic state. */
function createBlockProcessorContext(
	registry: HtmlBlockProcessorRegistry,
	inlineParser: HtmlInlineParser,
	idGenerator: DeterministicNormalizedBlockIdGenerator,
	inheritedInlineState: HtmlInlineState
): HtmlBlockProcessorContext {
	return {
		parseBlockChildren:
			parent =>
				parseBlockChildren(
					parent,
					registry,
					inlineParser,
					idGenerator,
					inheritedInlineState
				),

		parseInlineChildren:
			(parent, inlineOptions) =>
				inlineParser.parseNodes(
					parent.children,
					inlineOptions,
					inheritedInlineState
				),

		createBlock:
			(element, block) =>
				createNormalizedBlock(
					element,
					block,
					idGenerator
				)
	};
}

/** Returns whether a wrapper contains a registered structural tag. */
function hasRegisteredStructuralDescendant(
	element: Element,
	registry: HtmlBlockProcessorRegistry
): boolean {
	for (
		const child of element.children
	) {
		if (!isElement(
			child
		)) {
			continue;
		}

		const tag =
			child.name.toLowerCase();

		if (
			registry.has(
				tag
			)
		) {
			return true;
		}

		if (
			hasRegisteredStructuralDescendant(
				child,
				registry
			)
		) {
			return true;
		}
	}

	return false;
}

/**
 * Finalizes one normalized block with controlled presentation metadata and a
 * stable ID. Source IDs win; otherwise the deterministic generator supplies ID.
 */
function createNormalizedBlock(
	element: Element | undefined,
	block: NormalizedBlockCreationInput,
	idGenerator:
		DeterministicNormalizedBlockIdGenerator
): NormalizedBlock {
	const classes =
		element
			? projectNormalizedClasses(
				element
			)
			: undefined;

	const sourceId =
		element?.attribs.id;

	const id =
		idGenerator.createId(
			block.type,
			sourceId ||
				undefined
		);

	return {
		...block,
		...(classes
			? {
				class: classes
			}
			: {}),
		id
	};
}

/**
 * Collects descendant source IDs that can survive conversion so generated IDs
 * cannot collide with canonical block or inline-anchor identity. Unsupported and
 * intentionally ignored boundaries do not reserve addresses. The extraction root
 * itself is intentionally excluded.
 */
function collectPreservableDescendantElementIds(
	root: Element,
	elementSupport: HtmlElementSupportLookup
): string[] {
	const ids:
		string[] = [];

	const visit =
		(node: AnyNode): void => {
			if (
				!isElement(
					node
				)
			) {
				return;
			}

			const tag =
				node.name.toLowerCase();

			if (
				isIntentionallyIgnoredHtmlElement(
					tag
				)
			) {
				return;
			}

			if (
				node.attribs.id &&
				preservesHtmlElementSourceIdentity(
					tag,
					elementSupport
				)
			) {
				ids.push(
					node.attribs.id
				);
			}

			// Descend through tolerated unsupported wrappers because their supported
			// descendants may still preserve identities in canonical output.
			for (
				const child of node.children
			) {
				visit(
					child
				);
			}
		};

	for (
		const child of root.children
	) {
		visit(
			child
		);
	}

	return ids;
}

/** Returns true for source nodes that cannot contribute normalized content. */
function isIgnorableNode(
	node: AnyNode
): boolean {
	return (
		node.type ===
			'comment' ||
		(
			isTextNode(
				node
			) &&
			!node.data.trim()
		)
	);
}

/** Narrows DOM nodes that expose element name/attributes/children. */
function isElement(
	node: AnyNode
): node is Element {
	return (
		node.type ===
			'tag' ||
		node.type ===
			'script' ||
		node.type ===
			'style'
	);
}

/** Identifies executable/template elements intentionally excluded from conversion. */
function isIgnoredTag(
	tag: string
): boolean {
	return (
		tag ===
			'script' ||
		tag ===
			'style' ||
		tag ===
			'noscript' ||
		tag ===
			'template'
	);
}

/** Narrows a DOM node to source text. */
function isTextNode(
	node: AnyNode
): node is AnyNode & { data: string } {
	return (
		node.type ===
			'text' &&
		'data' in node
	);
}
