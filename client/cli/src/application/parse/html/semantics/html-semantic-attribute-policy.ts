import type {
	Element
} from 'domhandler';

/**
 * Attributes whose source meaning is already owned by another normalization
 * concern rather than by an element-specific semantic processor.
 *
 * `id` is handled by block identity / inline identity guards. `class` and
 * `style` are handled by the presentation projector and its diagnostics.
 */
const converterOwnedAttributes =
	new Set<string>([
		'id',
		'class',
		'style'
	]);

/** Element-specific attributes faithfully consumed by the current v1 model. */
const consumedAttributesByTag:
	Readonly<Record<string, readonly string[]>> = {
		a: [
			'href'
		]
	};

/** One source attribute whose meaning is not represented by v1. */
export interface UnsupportedHtmlSemanticAttribute {
	/** Lowercase source attribute name. */
	readonly name: string;

	/** Parsed source value, including the empty string for boolean attributes. */
	readonly value: string;
}

/**
 * Returns attributes on a supported element that NormalizedDocument v1 does not
 * currently represent.
 *
 * This is intentionally allowlist-based rather than a growing blacklist. Once an
 * element itself is supported, every attribute must either be owned elsewhere,
 * explicitly consumed by that element's normalization strategy, or reported.
 * `data-*` remains source/application metadata and is intentionally ignored.
 *
 * @param element Supported source element whose attribute semantics are inspected.
 * @returns Unrepresented attributes sorted by lowercase attribute name.
 */
export function getUnsupportedHtmlSemanticAttributes(
	element: Element
): UnsupportedHtmlSemanticAttribute[] {
	const tag =
		element.name.toLowerCase();

	const consumed =
		new Set(
			consumedAttributesByTag[
				tag
			] ?? []
		);

	return Object.entries(
		element.attribs
	)
		.map(
			([name, value]) => ({
				name:
					name.toLowerCase(),
				value
			})
		)
		.filter(
			attribute =>
				!converterOwnedAttributes.has(
					attribute.name
				) &&
				!attribute.name.startsWith(
					'data-'
				) &&
				!consumed.has(
					attribute.name
				)
		)
		.sort(
			(left, right) =>
				left.name.localeCompare(
					right.name
				)
		);
}
