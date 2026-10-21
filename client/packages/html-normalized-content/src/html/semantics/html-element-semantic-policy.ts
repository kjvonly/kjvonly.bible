/** HTML wrappers whose boundary carries no canonical meaning of its own. */
const transparentInlineElements =
	new Set<string>([
		'span'
	]);

/** Source elements intentionally omitted from normalized content. */
const intentionallyIgnoredElements =
	new Set<string>([
		'script',
		'style',
		'noscript',
		'template'
	]);

/**
 * Semantic block structures handled by the generic unsupported-block processor.
 * Their descendants remain representable while their source boundary is diagnosed.
 */
export const unsupportedSemanticBlockTags = [
	'address',
	'article',
	'aside',
	'dd',
	'dl',
	'dt',
	'footer',
	'header',
	'main',
	'nav',
	'section'
] as const;

/**
 * Registered structural wrappers whose descendants require specialized traversal
 * even though the wrapper's own source semantics are not represented by v1.
 */
export const unsupportedTableSectionTags = [
	'thead',
	'tbody',
	'tfoot'
] as const;

const unsupportedSemanticElements =
	new Set<string>([
		...unsupportedSemanticBlockTags,
		...unsupportedTableSectionTags
	]);

/** Lookup used to distinguish implemented element semantics from fallbacks. */
export interface HtmlElementSupportLookup {
	/** Whether a structural processor is registered for the lowercase tag. */
	hasBlockProcessor(
		tag: string
	): boolean;

	/** Whether an inline semantic processor is registered for the lowercase tag. */
	hasInlineProcessor(
		tag: string
	): boolean;

	/** Whether a registered inline processor can preserve projected presentation. */
	preservesInlinePresentation(
		tag: string
	): boolean;

	/** Whether a structural processor preserves the element boundary as block identity. */
	preservesBlockSourceIdentity(
		tag: string
	): boolean;
}

/**
 * Identifies the explicitly neutral inline wrapper (`span`), not structural `div`.
 *
 * @param tag Source HTML tag name; comparison is case-insensitive.
 * @returns Whether the inline boundary is intentionally presentation-capable but semantically neutral.
 */
export function isTransparentHtmlElement(
	tag: string
): boolean {
	return transparentInlineElements.has(
		tag.toLowerCase()
	);
}

/**
 * Classifies source elements whose complete subtree is deliberately excluded from
 * normalization. This policy is shared by block traversal, inline traversal,
 * diagnostics, and source-ID reservation so those responsibilities cannot drift.
 *
 * @param tag Source HTML tag to classify; comparison is case-insensitive.
 * @returns Whether the element and all descendants are intentionally ignored.
 */
export function isIntentionallyIgnoredHtmlElement(
	tag: string
): boolean {
	return intentionallyIgnoredElements.has(
		tag.toLowerCase()
	);
}

/**
 * Returns whether a source element's `id` is eligible to become canonical block
 * or zero-width inline-anchor identity. Unsupported, ignored, and flattening
 * structural boundaries do not reserve generated block IDs. Eligibility is
 * distinct from whether an otherwise-empty element is eventually emitted.
 *
 * @param tag Source HTML tag name; comparison is case-insensitive.
 * @param support Registered processor capabilities for the current composition.
 * @returns Whether the source boundary can preserve its ID in canonical content.
 */
export function preservesHtmlElementSourceIdentity(
	tag: string,
	support: HtmlElementSupportLookup
): boolean {
	const normalizedTag =
		tag.toLowerCase();

	if (
		isIntentionallyIgnoredHtmlElement(
			normalizedTag
		) ||
		isUnsupportedHtmlElement(
			normalizedTag,
			support
		)
	) {
		return false;
	}

	return (
		isTransparentHtmlElement(
			normalizedTag
		) ||
		support.hasInlineProcessor(
			normalizedTag
		) ||
		support.preservesBlockSourceIdentity(
			normalizedTag
		)
	);
}

/**
 * Returns whether an element currently has no faithful NormalizedDocument v1
 * representation and therefore requires a diagnostic when conversion continues.
 *
 * Unsupported elements are deliberately tolerated: descendant content is kept
 * wherever the existing block/inline model can represent it, while diagnostics
 * preserve the source tag and attributes for review. Processor registration alone
 * does not imply semantic support: some registered wrappers exist only to preserve
 * descendant grammar while their own source meaning remains unsupported.
 *
 * @param tag Source HTML tag to classify; comparison is case-insensitive.
 * @param support Registered block/inline capabilities available to conversion.
 * @returns Whether the element boundary has source semantics not represented by v1.
 */
export function isUnsupportedHtmlElement(
	tag: string,
	support: HtmlElementSupportLookup
): boolean {
	const normalizedTag =
		tag.toLowerCase();

	if (
		isIntentionallyIgnoredHtmlElement(
			normalizedTag
		) ||
		isTransparentHtmlElement(
			normalizedTag
		)
	) {
		return false;
	}

	if (
		unsupportedSemanticElements.has(
			normalizedTag
		)
	) {
		return true;
	}

	return (
		!support.hasBlockProcessor(
			normalizedTag
		) &&
		!support.hasInlineProcessor(
			normalizedTag
		)
	);
}
