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
 * Semantic block structures currently preserved only by recursively normalizing
 * their descendants. Their own source meaning is reported as unsupported.
 */
export const unsupportedSemanticBlockTags = [
	'dd',
	'dl',
	'dt'
] as const;

const unsupportedSemanticBlockElements =
	new Set<string>(
		unsupportedSemanticBlockTags
	);

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

	/** Whether a structural processor preserves the element boundary as block identity. */
	preservesBlockSourceIdentity(
		tag: string
	): boolean;
}

/** Returns whether an unregistered inline wrapper is deliberately semantics-free. */
export function isTransparentHtmlElement(
	tag: string
): boolean {
	return transparentInlineElements.has(
		tag.toLowerCase()
	);
}

/** Returns whether source content is deliberately omitted rather than normalized. */
export function isIntentionallyIgnoredHtmlElement(
	tag: string
): boolean {
	return intentionallyIgnoredElements.has(
		tag.toLowerCase()
	);
}

/**
 * Returns whether a source element's `id` can become canonical block or inline
 * identity. Unsupported/ignored/flattened structural boundaries are excluded.
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
 * preserve the source tag and attributes for review. Adding a real processor later
 * removes that element from this fallback without changing the canonical document.
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
		unsupportedSemanticBlockElements.has(
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
