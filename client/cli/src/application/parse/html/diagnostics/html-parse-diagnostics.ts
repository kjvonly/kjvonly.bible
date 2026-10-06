import type {
	AnyNode,
	Element
} from 'domhandler';

import type {
	NormalizedBlock
} from '#domain/normalized-content/models/normalized-block.model.js';

import type {
	NormalizedDocument
} from '#domain/normalized-content/models/normalized-document.model.js';

import {
	getDocumentLocalLinkTargetId,
	getUnsafeNormalizedLinkScheme
} from '#domain/normalized-content/links/normalized-link-target.js';

import type {
	ParseDiagnostics,
	ParseWarning
} from '../../diagnostics/parse-diagnostics.js';

import {
	getIgnoredSourceClassNames
} from '../projection/html-normalized-class-projector.js';

import {
	isIntentionallyIgnoredHtmlElement,
	isUnsupportedHtmlElement,
	preservesHtmlElementSourceIdentity,
	type HtmlElementSupportLookup
} from '../semantics/html-element-semantic-policy.js';

import {
	getUnsupportedHtmlSemanticAttributes
} from '../semantics/html-semantic-attribute-policy.js';

/**
 * Builds an auditable conversion report from the accepted document and the
 * descendants of its extraction root. The boundary element itself is selector
 * metadata, not normalized source content, so its IDs/classes are not reported.
 */
export function createHtmlParseDiagnostics(
	root: Element,
	document: NormalizedDocument,
	elementSupport: HtmlElementSupportLookup
): ParseDiagnostics {
	const sourceIds =
		new Set<string>();

	const ignoredClassCounts =
		new Map<string, number>();

	const ignoredElementCounts =
		new Map<string, number>();

	const unsupportedElementCounts =
		new Map<string, number>();

	const unsupportedAttributeCounts =
		new Map<string, number>();

	const unsafeLinkTargetCounts =
		new Map<string, number>();

	const missingLocalLinkTargetCounts =
		new Map<string, number>();

	const canonicalIds =
		collectCanonicalIds(
			document.blocks
		);

	visitDescendantElements(
		root,
		element => {
			for (
				const className of
					getIgnoredSourceClassNames(
						element
					)
			) {
				increment(
					ignoredClassCounts,
					className
				);
			}

			const tag =
				element.name.toLowerCase();

			if (
				isIntentionallyIgnoredHtmlElement(
					tag
				)
			) {
				increment(
					ignoredElementCounts,
					tag
				);
				return;
			}

			if (
				isUnsupportedHtmlElement(
					tag,
					elementSupport
				)
			) {
				increment(
					unsupportedElementCounts,
					formatHtmlElementOpeningTag(
						element
					)
				);
				return;
			}

			const sourceId =
				element.attribs.id;

			if (
				sourceId &&
				preservesHtmlElementSourceIdentity(
					tag,
					elementSupport
				)
			) {
				sourceIds.add(
					sourceId
				);
			}

			const sourceTag =
				formatHtmlElementOpeningTag(
					element
				);

			if (
				tag === 'a' &&
				element.attribs.href !== undefined
			) {
				const href =
					element.attribs.href;

				const unsafeScheme =
					getUnsafeNormalizedLinkScheme(
						href
					);

				if (unsafeScheme) {
					increment(
						unsafeLinkTargetCounts,
						`Unsafe source HTML link target on ${sourceTag} uses the ${unsafeScheme}: scheme; descendant content was normalized, but executable link behavior was not preserved.`
					);
				} else {
					const localTargetId =
						getDocumentLocalLinkTargetId(
							href
						);

					if (
						localTargetId &&
						!canonicalIds.has(
							localTargetId
						)
					) {
						increment(
							missingLocalLinkTargetCounts,
							`Document-local source link target "${href}" on ${sourceTag} does not resolve to a canonical block or inline anchor inside the selected extraction boundary.`
						);
					}
				}
			}

			for (
				const attribute of
					getUnsupportedHtmlSemanticAttributes(
						element
					)
			) {
				increment(
					unsupportedAttributeCounts,
					`Unsupported source HTML attribute "${attribute.name}" on ${sourceTag}; the element was normalized, but this attribute's semantics were not preserved.`
				);
			}
		}
	);

	const metrics =
		countDocumentMetrics(
			document.blocks,
			sourceIds
		);

	return {
		blocksProduced:
			metrics.blocksProduced,
		wordsProduced:
			metrics.wordsProduced,
		sourceIdsPreserved:
			metrics.sourceIdsPreserved,
		idsGenerated:
			metrics.idsGenerated,
		linkedWordsProduced:
			metrics.linkedWordsProduced,
		warnings: [
			...toClassWarnings(
				ignoredClassCounts
			),
			...toElementWarnings(
				ignoredElementCounts
			),
			...toUnsupportedElementWarnings(
				unsupportedElementCounts
			),
			...toUnsupportedAttributeWarnings(
				unsupportedAttributeCounts
			),
			...toUnsafeLinkTargetWarnings(
				unsafeLinkTargetCounts
			),
			...toMissingLocalLinkTargetWarnings(
				missingLocalLinkTargetCounts
			)
		]
	};
}

/** Collects every canonical block/inline-anchor identity in the accepted document. */
function collectCanonicalIds(
	blocks: readonly NormalizedBlock[]
): Set<string> {
	const ids =
		new Set<string>();

	for (
		const block of blocks
	) {
		if (block.id) {
			ids.add(
				block.id
			);
		}

		if ('content' in block) {
			for (
				const entry of block.content
			) {
				if (
					entry.type ===
						'anchor'
				) {
					ids.add(
						entry.id
					);
				}
			}
		}

		if ('blocks' in block) {
			for (
				const childId of collectCanonicalIds(
					block.blocks
				)
			) {
				ids.add(
					childId
				);
			}
		}
	}

	return ids;
}

/** Mutable accumulator used while recursively counting one normalized subtree. */
interface DocumentMetrics {
	/** Number of normalized blocks in the visited subtree. */
	blocksProduced: number;

	/** Number of normalized word units in the visited subtree. */
	wordsProduced: number;

	/** Number of canonical block/anchor IDs preserved verbatim from source HTML. */
	sourceIdsPreserved: number;

	/** Number of block IDs generated by normalization. */
	idsGenerated: number;

	/** Number of normalized words carrying at least one link target. */
	linkedWordsProduced: number;
}

function countDocumentMetrics(
	blocks: readonly NormalizedBlock[],
	sourceIds: ReadonlySet<string>
): DocumentMetrics {
	const metrics:
		DocumentMetrics = {
			blocksProduced:
				0,
			wordsProduced:
				0,
			sourceIdsPreserved:
				0,
			idsGenerated:
				0,
			linkedWordsProduced:
				0
		};

	// Count the current level first; structural blocks recurse below so nested
	// content contributes to the same document-wide totals.
	for (
		const block of blocks
	) {
		metrics.blocksProduced++;

		if (
			block.id &&
			sourceIds.has(
				block.id
			)
		) {
			metrics.sourceIdsPreserved++;
		} else {
			metrics.idsGenerated++;
		}

		if ('content' in block) {
			for (
				const entry of block.content
			) {
				if (
					entry.type ===
						'anchor'
				) {
					if (
						sourceIds.has(
							entry.id
						)
					) {
						metrics.sourceIdsPreserved++;
					}
					continue;
				}

				if (
					entry.type !==
						'word'
				) {
					continue;
				}

				metrics.wordsProduced++;

				if (
					entry.href &&
					entry.href.length >
						0
				) {
					metrics.linkedWordsProduced++;
				}
			}
		}

		if ('blocks' in block) {
			// Descend into structural children and fold their independent subtree
			// totals into the accumulator for this level.
			const childMetrics =
				countDocumentMetrics(
					block.blocks,
					sourceIds
				);

			metrics.blocksProduced +=
				childMetrics.blocksProduced;
			metrics.wordsProduced +=
				childMetrics.wordsProduced;
			metrics.sourceIdsPreserved +=
				childMetrics.sourceIdsPreserved;
			metrics.idsGenerated +=
				childMetrics.idsGenerated;
			metrics.linkedWordsProduced +=
				childMetrics.linkedWordsProduced;
		}
	}

	return metrics;
}

/** Visits only elements inside the extraction boundary, never the boundary itself. */
function visitDescendantElements(
	root: Element,
	visit: (element: Element) => void
): void {
	for (
		const child of root.children
	) {
		visitElement(
			child,
			visit
		);
	}
}

/** Visits one descendant element and its nested element subtree depth-first. */
function visitElement(
	node: AnyNode,
	visit: (element: Element) => void
): void {
	if (!isElement(node)) {
		return;
	}

	visit(
		node
	);

	// Continue depth-first through the source tree so ignored elements/classes
	// are counted regardless of nesting depth.
	for (
		const child of node.children
	) {
		visitElement(
			child,
			visit
		);
	}
}

/** Narrows source DOM nodes that participate in element diagnostics. */
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

/** Increments one deterministic warning counter. */
function increment(
	counts: Map<string, number>,
	key: string
): void {
	counts.set(
		key,
		(counts.get(
			key
		) ?? 0) + 1
	);
}

/** Converts ignored-class counters into stable, sorted diagnostics. */
function toClassWarnings(
	counts: ReadonlyMap<string, number>
): ParseWarning[] {
	return [
		...counts.entries()
	]
		.sort(
			([left], [right]) =>
				left.localeCompare(
					right
				)
		)
		.map(
			([className, count]) => ({
				code:
					'html-class-ignored',
				message:
					`Ignored source HTML class "${className}".`,
				count
			})
		);
}

/** Converts ignored-element counters into stable, sorted diagnostics. */
function toElementWarnings(
	counts: ReadonlyMap<string, number>
): ParseWarning[] {
	return [
		...counts.entries()
	]
		.sort(
			([left], [right]) =>
				left.localeCompare(
					right
				)
		)
		.map(
			([tag, count]) => ({
				code:
					'html-element-ignored',
				message:
					`Ignored source HTML element <${tag}>.`,
				count
			})
		);
}

/** Converts unsupported-element counters into stable, source-rich diagnostics. */
function toUnsupportedElementWarnings(
	counts: ReadonlyMap<string, number>
): ParseWarning[] {
	return [
		...counts.entries()
	]
		.sort(
			([left], [right]) =>
				left.localeCompare(
					right
				)
		)
		.map(
			([sourceTag, count]) => ({
				code:
					'html-element-unsupported',
				message:
					`Unsupported source HTML element ${sourceTag}; descendant content was preserved where representable, but this element's semantics were not normalized.`,
				count
			})
		);
}


/** Converts unsupported-attribute counters into stable, source-rich diagnostics. */
function toUnsupportedAttributeWarnings(
	counts: ReadonlyMap<string, number>
): ParseWarning[] {
	return [
		...counts.entries()
	]
		.sort(
			([left], [right]) =>
				left.localeCompare(
					right
				)
		)
		.map(
			([message, count]) => ({
				code:
					'html-attribute-unsupported',
				message,
				count
			})
		);
}

/** Converts stripped unsafe-link counters into stable diagnostics. */
function toUnsafeLinkTargetWarnings(
	counts: ReadonlyMap<string, number>
): ParseWarning[] {
	return [
		...counts.entries()
	]
		.sort(
			([left], [right]) =>
				left.localeCompare(
					right
				)
		)
		.map(
			([message, count]) => ({
				code:
					'html-link-target-unsafe',
				message,
				count
			})
		);
}

/** Converts unresolved local-fragment counters into stable diagnostics. */
function toMissingLocalLinkTargetWarnings(
	counts: ReadonlyMap<string, number>
): ParseWarning[] {
	return [
		...counts.entries()
	]
		.sort(
			([left], [right]) =>
				left.localeCompare(
					right
				)
		)
		.map(
			([message, count]) => ({
				code:
					'html-local-link-target-missing',
				message,
				count
			})
		);
}

/** Formats one source opening tag, including attributes, for actionable diagnostics. */
function formatHtmlElementOpeningTag(
	element: Element
): string {
	const attributes =
		Object.entries(
			element.attribs
		)
			.sort(
				([left], [right]) =>
					left.localeCompare(
						right
					)
			)
			.map(
				([name, value]) =>
					value === ''
						? name
						: `${name}="${escapeDiagnosticAttribute(value)}"`
			);

	return `<${element.name.toLowerCase()}${
		attributes.length > 0
			? ` ${attributes.join(' ')}`
			: ''
	}>`;
}

/** Escapes diagnostic attribute values without trying to serialize HTML. */
function escapeDiagnosticAttribute(
	value: string
): string {
	return value
		.replaceAll(
			'&',
			'&amp;'
		)
		.replaceAll(
			'"',
			'&quot;'
		);
}
