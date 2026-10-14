/**
 * Natural, case-insensitive ordering for FileManager labels and paths.
 *
 * Numeric segments sort by their values (1, 2, 10). When the collator
 * considers two distinct names equivalent (e.g. "1" and "01"), a code-point
 * comparison provides a stable tie-break independent of input order.
 * Keep this pure so Browse and the Search Worker use identical ordering.
 */
const nameCollator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: 'base'
});

export function compareFileManagerNames(
	left: string,
	right: string
): number {
	const result = nameCollator.compare(left, right);

	if (result !== 0) {
		return result;
	}

	return left < right ? -1 : left > right ? 1 : 0;
}
