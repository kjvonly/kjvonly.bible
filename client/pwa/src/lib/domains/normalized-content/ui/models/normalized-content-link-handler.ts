/**
 * Handles the ordered link targets attached to one normalized word.
 *
 * The first target remains the browser-native `href`. Hosts may inspect the
 * complete ordered collection for application-specific alternatives. Returning
 * true means the host handled the activation and native navigation should be
 * prevented; returning false preserves native behavior for the first target.
 *
 * @param hrefs Canonical link targets in document order.
 * @returns True when the host handled the activation; otherwise false.
 */
export type NormalizedContentLinkHandler = (
	hrefs: readonly string[]
) => boolean;
