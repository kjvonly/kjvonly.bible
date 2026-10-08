/**
 * URI schemes whose browser-native navigation semantics are not safe to persist
 * as executable normalized-content link targets.
 */
const UNSAFE_NORMALIZED_LINK_SCHEMES =
	new Set<string>([
		'javascript',
		'vbscript',
		'data'
	]);

/**
 * Returns the unsafe URI scheme carried by a normalized link target, if any.
 *
 * Scheme detection removes ASCII tab/newline/carriage-return characters because
 * browsers may ignore those characters while interpreting a URL scheme. Relative,
 * fragment, application, and ordinary external targets remain otherwise opaque to
 * the Normalized Content Domain.
 */
export function getUnsafeNormalizedLinkScheme(
	target: string
): string | undefined {
	const schemeCandidate =
		target
			.replace(
				/[\t\n\r]/g,
				''
			)
			.trimStart();

	const match =
		/^([a-z][a-z0-9+.-]*):/i.exec(
			schemeCandidate
		);

	if (!match) {
		return undefined;
	}

	const scheme =
		match[1]?.toLowerCase();

	if (!scheme) {
		return undefined;
	}

	return UNSAFE_NORMALIZED_LINK_SCHEMES.has(
		scheme
	)
		? scheme
		: undefined;
}

/** Returns whether a target may be persisted as canonical normalized link data. */
export function isSafeNormalizedLinkTarget(
	target: string
): boolean {
	return getUnsafeNormalizedLinkScheme(
		target
	) === undefined;
}

/**
 * Returns the exact document-local identity referenced by a simple fragment link.
 * Empty `#` targets intentionally return undefined because they mean the document
 * top rather than one canonical block/inline-anchor identity.
 */
export function getDocumentLocalLinkTargetId(
	target: string
): string | undefined {
	if (
		!target.startsWith(
			'#'
		) ||
		target.length <= 1
	) {
		return undefined;
	}

	return target.slice(
		1
	);
}
