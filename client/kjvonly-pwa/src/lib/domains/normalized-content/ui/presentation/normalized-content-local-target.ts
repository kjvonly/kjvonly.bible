/**
 * Resolves a document-local normalized target within one rendered document root.
 *
 * Normalized block IDs and inline-anchor IDs share one document-local namespace.
 * Lookup must therefore stay scoped to the owning rendered document instead of
 * using document-wide ID APIs, because multiple mounted documents may legally
 * contain the same snapshot-local IDs.
 *
 * @param root Root that owns one rendered NormalizedDocument instance.
 * @param href Canonical link target to inspect.
 * @returns The matching normalized target when the href is a resolvable local fragment.
 */
export function findNormalizedContentLocalTarget(
	root: ParentNode,
	href: string
): HTMLElement | undefined {
	const targetId = readLocalFragmentTargetId(
		href
	);

	if (targetId === undefined) {
		return undefined;
	}

	const candidates =
		root.querySelectorAll<HTMLElement>(
			'[id]'
		);

	for (
		let index = 0;
		index < candidates.length;
		index += 1
	) {
		const candidate =
			candidates.item(index);

		if (candidate.id === targetId) {
			return candidate;
		}
	}

	return undefined;
}

/**
 * Reads the target ID from a local fragment while preserving malformed escapes
 * literally rather than turning renderer navigation into a validation boundary.
 */
function readLocalFragmentTargetId(
	href: string
): string | undefined {
	if (
		!href.startsWith('#') ||
		href.length === 1
	) {
		return undefined;
	}

	const fragment = href.slice(1);

	try {
		return decodeURIComponent(
			fragment
		);
	} catch {
		return fragment;
	}
}
