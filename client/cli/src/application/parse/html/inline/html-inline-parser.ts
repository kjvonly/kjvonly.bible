import {
	isText
} from 'domhandler';

import type {
	AnyNode,
	Element
} from 'domhandler';

import type {
	NormalizedContent
} from '@kjvonly/normalized-content';

import {
	projectNormalizedClasses
} from '../projection/html-normalized-class-projector.js';

import {
	isIntentionallyIgnoredHtmlElement,
	isTransparentHtmlElement
} from '../semantics/html-element-semantic-policy.js';

import {
	HtmlInlineProcessorRegistry
} from './html-inline-processor-registry.js';

import {
	cloneHtmlInlineState,
	createHtmlInlineState,
	type HtmlInlineState
} from './html-inline-state.js';

import {
	appendHtmlInlineText,
	createHtmlInlineTextStreamState,
	trimBoundaryLineBreaksFromPreformattedSourceNewlines,
	type HtmlInlineTextStreamState
} from './html-inline-tokenizer.js';

/** Optional source-text behavior for one inline parsing run. */
export interface HtmlInlineParseOptions {
	/** Preserve rendered source newline characters for preformatted text such as <pre>. */
	preservePreformattedSourceNewlines?: boolean;
}

/** Inline contribution produced by a wrapper whose descendants enter block traversal. */
export interface HtmlInlineDescendantContext {
	/** Decorated semantic state inherited by every descendant inline run. */
	readonly state: HtmlInlineState;

	/** Zero-width canonical content located at the wrapper's opening boundary. */
	readonly leadingContent: NormalizedContent[];
}

/**
 * Recursively projects inline HTML into ordered NormalizedContent units.
 *
 * Inline formatting behaves like nested decorators: each element receives cloned
 * inherited state, applies its tag strategy, then passes that state to descendants.
 * Structural traversal remains outside this parser and is rejected if encountered.
 */
export class HtmlInlineParser {
	constructor(
		private readonly processorRegistry:
			HtmlInlineProcessorRegistry,
		private readonly isStructuralTag:
			(tag: string) => boolean
	) {}

	/**
	 * Returns whether an inline semantic processor is registered for the tag.
	 *
	 * @param tag HTML tag queried by structural conversion/diagnostics.
	 * @returns Whether that tag has explicit inline semantic handling.
	 */
	hasProcessor(
		tag: string
	): boolean {
		return this.processorRegistry.has(
			tag
		);
	}

	/**
	 * Returns whether a registered inline processor can carry projected presentation.
	 *
	 * @param tag HTML tag queried by conversion/diagnostics.
	 * @returns Whether projected classes/styles can survive that processor boundary.
	 */
	preservesProcessorPresentation(
		tag: string
	): boolean {
		return this.processorRegistry.preservesProjectedPresentation(
			tag
		);
	}

	/**
	 * Applies one inline wrapper's semantics without traversing its children.
	 *
	 * Structural traversal uses this when an inline semantic wrapper contains block
	 * descendants. The context carries both inherited descendant semantics and any
	 * zero-width anchor contributed at the wrapper opening boundary.
	 *
	 * @param element Supported/transparent inline wrapper surrounding block descendants.
	 * @param inheritedState Inline semantics inherited before entering the wrapper.
	 * @returns Descendant state plus zero-width content emitted at the opening boundary.
	 */
	createDescendantInlineContext(
		element: Element,
		inheritedState: HtmlInlineState
	): HtmlInlineDescendantContext {
		const tag =
			element.name.toLowerCase();

		if (
			!this.processorRegistry.has(
				tag
			) &&
			!isTransparentHtmlElement(
				tag
			)
		) {
			throw new Error(
				`Cannot derive supported inline semantics from <${tag}>.`
			);
		}

		const content:
			NormalizedContent[] = [];

		const result =
			this.applyElementSemantics(
				element,
				inheritedState,
				content
			);

		if (
			content.some(
				entry =>
					entry.type !==
						'anchor'
			) ||
			!result.recurse
		) {
			throw new Error(
				`Inline HTML element <${element.name.toLowerCase()}> cannot carry semantics across block descendants.`
			);
		}

		return {
			state:
				result.state,
			leadingContent:
				content
		};
	}

	/**
	 * Parses sibling inline nodes in source order with optional inherited semantics.
	 *
	 * @param nodes Source nodes sharing one horizontal text stream.
	 * @param options Source-newline behavior for this parsing run.
	 * @param inheritedState Optional semantics inherited from an enclosing inline wrapper.
	 * @returns Ordered canonical inline content with lexical continuity preserved.
	 */
	parseNodes(
		nodes: readonly AnyNode[],
		options: HtmlInlineParseOptions = {},
		inheritedState?: HtmlInlineState
	): NormalizedContent[] {
		const content:
			NormalizedContent[] = [];

		const initialState =
			inheritedState
				? cloneHtmlInlineState(
					inheritedState
				)
				: createHtmlInlineState();

		const textStream =
			createHtmlInlineTextStreamState();

		// Semantic state is cloned before decorators mutate it, while visible-text
		// continuity is intentionally shared across every sibling/descendant. A DOM
		// boundary is not itself a visible separator in the rendered text stream.
		for (
			const node of nodes
		) {
			this.parseNode(
				node,
				initialState,
				content,
				textStream,
				options
			);
		}

		if (
			options.preservePreformattedSourceNewlines !==
				true
		) {
			return content;
		}

		return trimBoundaryLineBreaksFromPreformattedSourceNewlines(
			content,
			textStream
		);
	}

	/**
	 * Applies one inline element boundary to cloned descendant semantic state.
	 *
	 * Only supported inline processors and explicitly neutral wrappers may project
	 * boundary identity/presentation into canonical content. Unsupported wrappers
	 * recurse solely to preserve representable descendants.
	 *
	 * @param element Source inline element at the current semantic boundary.
	 * @param state Inline semantics inherited before entering the element.
	 * @param content Ordered canonical content receiving zero-width emissions.
	 * @returns Descendant state plus the processor's recursion decision.
	 */
	private applyElementSemantics(
		element: Element,
		state: HtmlInlineState,
		content: NormalizedContent[]
	): ReturnType<HtmlInlineProcessorRegistry['process']> {
		const tag =
			element.name.toLowerCase();

		const hasInlineProcessor =
			this.processorRegistry.has(
				tag
			);

		const isTransparent =
			isTransparentHtmlElement(
				tag
			);

		// Supported/neutral inline IDs are canonical zero-width anchors at the
		// element's opening boundary. Unsupported wrappers remain diagnostic-only.
		if (
			element.attribs.id &&
			(
				hasInlineProcessor ||
				isTransparent
			)
		) {
			content.push({
				type:
					'anchor',
				id:
					state.resolveAnchorId?.(element.attribs.id) ??
					element.attribs.id
			});
		}

		const childState =
			cloneHtmlInlineState(
				state
			);

		// Presentation projection belongs only to source boundaries whose semantics
		// are supported or explicitly neutral. Unsupported inline wrappers recurse
		// only to preserve descendant content; their own presentation metadata is
		// captured by the unsupported-element diagnostic rather than normalized.
		if (
			isTransparent ||
			(
				hasInlineProcessor &&
				this.processorRegistry.preservesProjectedPresentation(
					tag
				)
			)
		) {
			for (
				const className of
					projectNormalizedClasses(
						element
					) ?? []
			) {
				childState.classes.add(
					className
				);
			}
		}

		return this.processorRegistry.process(
			element,
			childState,
			content
		);
	}

	/**
	 * Walks one inline node and recursively applies inherited/decorated semantics.
	 * Structural tags are rejected because block traversal owns their structure;
	 * supported/neutral inline IDs become zero-width canonical anchors.
	 */
	private parseNode(
		node: AnyNode,
		state: HtmlInlineState,
		content: NormalizedContent[],
		textStream: HtmlInlineTextStreamState,
		options: HtmlInlineParseOptions
	): void {
		if (
			isText(
				node
			)
		) {
			appendHtmlInlineText(
				node.data,
				state,
				content,
				textStream,
				options.preservePreformattedSourceNewlines ===
					true
			);
			return;
		}

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
			this.isStructuralTag(
				tag
			)
		) {
			throw new Error(
				`Block element <${tag}> cannot be normalized inside inline content.`
			);
		}

		const result =
			this.applyElementSemantics(
				node,
				state,
				content
			);

		if (!result.recurse) {
			return;
		}

		// Descend depth-first so nested decorators are applied in DOM order while
		// the same output array preserves the visible inline sequence.
		for (
			const child of node.children
		) {
			this.parseNode(
				child,
				result.state,
				content,
				textStream,
				options
			);
		}
	}
}

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
