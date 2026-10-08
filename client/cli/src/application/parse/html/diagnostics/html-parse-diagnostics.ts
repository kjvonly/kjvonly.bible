import type {
	AnyNode,
	Element
} from 'domhandler';

import type {
	NormalizedBlock
} from '@kjvonly/normalized-content';

import type {
	NormalizedDocument
} from '@kjvonly/normalized-content';

import {
	getDocumentLocalLinkTargetId,
	getUnsafeNormalizedLinkScheme
} from '@kjvonly/normalized-content';

import type {
	ParseDiagnostics,
	ParseSourceLocation,
	ParseWarning
} from '../../diagnostics/parse-diagnostics.js';

import {
	getIgnoredSourceClassNames,
	getUnsupportedSourceStyleDeclarations
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
 *
 * @param root Selected extraction boundary whose descendants were normalized.
 * @param document Accepted canonical document produced from that boundary.
 * @param elementSupport Parser support lookup used to classify source elements.
 * @param getSourceLocation Resolves authored source coordinates for diagnostic metadata.
 * @returns Import-only metrics and non-fatal source-loss diagnostics.
 */
export function createHtmlParseDiagnostics(
	root: Element,
	document: NormalizedDocument,
	elementSupport: HtmlElementSupportLookup,
	getSourceLocation:
		(element: Element) => ParseSourceLocation | undefined =
			() => undefined
): ParseDiagnostics {
	const sourceIds =
		new Set<string>();

	const ignoredClassCounts =
		new Map<string, WarningOccurrences>();

	const ignoredElementCounts =
		new Map<string, WarningOccurrences>();

	const unsupportedElementCounts =
		new Map<string, WarningOccurrences>();

	const unsupportedAttributeCounts =
		new Map<string, WarningOccurrences>();

	const unsupportedStyleCounts =
		new Map<string, WarningOccurrences>();

	const unsafeLinkTargetCounts =
		new Map<string, WarningOccurrences>();

	const missingLocalLinkTargetCounts =
		new Map<string, WarningOccurrences>();

	const canonicalIds =
		collectCanonicalIds(
			document.blocks
		);

	visitDescendantElements(
		root,
		element => {
			const sourceLocation =
				getSourceLocation(
					element
				);

			const tag =
				element.name.toLowerCase();

			const sourceTag =
				formatHtmlElementOpeningTag(
					element
				);

			if (
				isIntentionallyIgnoredHtmlElement(
					tag
				)
			) {
				increment(
					ignoredElementCounts,
					sourceTag,
					sourceLocation
				);

				// Conversion discards this entire source subtree, so diagnostics stop at
				// the ignored boundary instead of reporting semantics that were never
				// considered for canonical normalization.
				return false;
			}

			if (
				isUnsupportedHtmlElement(
					tag,
					elementSupport
				)
			) {
				increment(
					unsupportedElementCounts,
					sourceTag,
					sourceLocation
				);
				return;
			}

			for (
				const className of
					getIgnoredSourceClassNames(
						element
					)
			) {
				increment(
					ignoredClassCounts,
					className,
					sourceLocation
				);
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

			for (
				const declaration of
					getUnsupportedSourceStyleDeclarations(
						element
					)
			) {
				increment(
					unsupportedStyleCounts,
					`Unsupported source HTML style declaration "${declaration.property}:${declaration.value}" on ${sourceTag}; the element was normalized, but this declaration's presentation semantics were not preserved.`,
					sourceLocation
				);
			}

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
						`Unsafe source HTML link target on ${sourceTag} uses the ${unsafeScheme}: scheme; descendant content was normalized, but executable link behavior was not preserved.`,
						sourceLocation
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
							`Document-local source link target "${href}" on ${sourceTag} does not resolve to a canonical block or inline anchor inside the selected extraction boundary.`,
							sourceLocation
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
					`Unsupported source HTML attribute "${attribute.name}" on ${sourceTag}; the element was normalized, but this attribute's semantics were not preserved.`,
					sourceLocation
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
			...toUnsupportedStyleWarnings(
				unsupportedStyleCounts
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

/**
 * Visits elements inside the extraction boundary, never the boundary itself.
 *
 * @param root Extraction boundary whose descendants are inspected.
 * @param visit Visitor that may return `false` to prune one source subtree.
 */
function visitDescendantElements(
	root: Element,
	visit: (element: Element) => boolean | void
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

/**
 * Visits one descendant element depth-first unless the visitor prunes its subtree.
 *
 * @param node Source node to inspect.
 * @param visit Visitor that returns `false` when descendants must be excluded.
 */
function visitElement(
	node: AnyNode,
	visit: (element: Element) => boolean | void
): void {
	if (!isElement(node)) {
		return;
	}

	const shouldDescend =
		visit(
			node
		) !== false;

	if (!shouldDescend) {
		return;
	}

	// Continue depth-first only while the source boundary participates in
	// conversion/diagnostic inspection. Intentionally ignored elements prune their
	// complete subtree just as conversion does.
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

/** Aggregated occurrences for one stable diagnostic key. */
interface WarningOccurrences {
	/** Number of equivalent source conditions encountered. */
	count: number;

	/** Authored source positions known for those occurrences. */
	readonly sourceLocations: ParseSourceLocation[];
}

/** Increments one deterministic warning counter and preserves known positions. */
function increment(
	counts: Map<string, WarningOccurrences>,
	key: string,
	sourceLocation?: ParseSourceLocation
): void {
	const occurrences =
		counts.get(
			key
		);

	if (occurrences) {
		occurrences.count++;

		if (sourceLocation) {
			occurrences.sourceLocations.push(
				sourceLocation
			);
		}

		return;
	}

	counts.set(
		key,
		{
			count:
				1,
			sourceLocations:
				sourceLocation
					? [sourceLocation]
					: []
		}
	);
}

/** Creates one warning while omitting location metadata when none is known. */
function createParseWarning(
	code: string,
	message: string,
	occurrences: WarningOccurrences
): ParseWarning {
	const warning = {
		code,
		message,
		count:
			occurrences.count
	};

	return occurrences.sourceLocations.length > 0
		? {
			...warning,
			sourceLocations:
				occurrences.sourceLocations
		}
		: warning;
}

/** Converts ignored-class counters into stable, sorted diagnostics. */
function toClassWarnings(
	counts: ReadonlyMap<string, WarningOccurrences>
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
			([className, occurrences]) =>
				createParseWarning(
					'html-class-ignored',
					`Ignored source HTML class "${className}".`,
					occurrences
				)
		);
}

/** Converts unsupported-style counters into stable, source-rich diagnostics. */
function toUnsupportedStyleWarnings(
	counts: ReadonlyMap<string, WarningOccurrences>
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
			([message, occurrences]) =>
				createParseWarning(
					'html-style-unsupported',
					message,
					occurrences
				)
		);
}

/** Converts ignored-element counters into stable, source-rich diagnostics. */
function toElementWarnings(
	counts: ReadonlyMap<string, WarningOccurrences>
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
			([sourceTag, occurrences]) =>
				createParseWarning(
					'html-element-ignored',
					`Ignored source HTML element ${sourceTag}.`,
					occurrences
				)
		);
}

/** Converts unsupported-element counters into stable, source-rich diagnostics. */
function toUnsupportedElementWarnings(
	counts: ReadonlyMap<string, WarningOccurrences>
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
			([sourceTag, occurrences]) =>
				createParseWarning(
					'html-element-unsupported',
					`Unsupported source HTML element ${sourceTag}; descendant content was preserved where representable, but this element's semantics were not normalized.`,
					occurrences
				)
		);
}


/** Converts unsupported-attribute counters into stable, source-rich diagnostics. */
function toUnsupportedAttributeWarnings(
	counts: ReadonlyMap<string, WarningOccurrences>
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
			([message, occurrences]) =>
				createParseWarning(
					'html-attribute-unsupported',
					message,
					occurrences
				)
		);
}

/** Converts stripped unsafe-link counters into stable diagnostics. */
function toUnsafeLinkTargetWarnings(
	counts: ReadonlyMap<string, WarningOccurrences>
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
			([message, occurrences]) =>
				createParseWarning(
					'html-link-target-unsafe',
					message,
					occurrences
				)
		);
}

/** Converts unresolved local-fragment counters into stable diagnostics. */
function toMissingLocalLinkTargetWarnings(
	counts: ReadonlyMap<string, WarningOccurrences>
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
			([message, occurrences]) =>
				createParseWarning(
					'html-local-link-target-missing',
					message,
					occurrences
				)
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
