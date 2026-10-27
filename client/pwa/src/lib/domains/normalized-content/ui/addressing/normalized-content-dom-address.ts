import type {
	NormalizedContentAddress
} from '../../models/normalized-content-address.model';

/**
 * UI compatibility alias for the semantic Normalized Content token address.
 *
 * DOM lookup does not own the identity shape; it only projects rendered browser
 * nodes back to the canonical `blockId + contentIndex` address.
 */
export type NormalizedContentDomAddress =
	NormalizedContentAddress;

const NORMALIZED_BLOCK_SELECTOR =
	'[data-normalized-block]';

const NORMALIZED_CONTENT_INDEX_SELECTOR =
	'[data-normalized-content-index]';

/**
 * Resolves a DOM node back to the canonical inline address rendered for it.
 *
 * The address is intentionally scoped to one rendered document root and one
 * NormalizedDocument snapshot. `contentIndex` is the canonical array position;
 * it is not promoted into cross-revision identity.
 *
 * @param root Rendered NormalizedDocument root that owns the node.
 * @param node DOM node whose canonical inline address should be resolved.
 */
export function resolveNormalizedContentDomAddress(
	root: HTMLElement,
	node: Node
): NormalizedContentAddress | undefined {
	const element =
		getAddressableElement(
			node
		);

	if (
		!element ||
		!root.contains(element)
	) {
		return undefined;
	}

	const contentElement =
		element.closest<HTMLElement>(
			NORMALIZED_CONTENT_INDEX_SELECTOR
		);

	if (
		!contentElement ||
		!root.contains(contentElement)
	) {
		return undefined;
	}

	const blockElement =
		contentElement.closest<HTMLElement>(
			NORMALIZED_BLOCK_SELECTOR
		);

	if (
		!blockElement ||
		!root.contains(blockElement) ||
		blockElement.id.length === 0
	) {
		return undefined;
	}

	const contentIndex =
		parseContentIndex(
			contentElement.dataset
				.normalizedContentIndex
		);

	if (contentIndex === undefined) {
		return undefined;
	}

	return {
		blockId: blockElement.id,
		contentIndex
	};
}

/**
 * Returns the Element that owns or contains the supplied DOM node.
 *
 * @param node DOM node being resolved to renderer-owned semantic metadata.
 */
function getAddressableElement(
	node: Node
): Element | undefined {
	if (node instanceof Element) {
		return node;
	}

	return node.parentElement ??
		undefined;
}

/**
 * Parses one renderer-owned canonical content index from a DOM data attribute.
 *
 * @param value Serialized `data-normalized-content-index` value.
 */
function parseContentIndex(
	value: string | undefined
): number | undefined {
	if (value === undefined) {
		return undefined;
	}

	const parsed = Number(value);

	if (
		!Number.isInteger(parsed) ||
		parsed < 0
	) {
		return undefined;
	}

	return parsed;
}
