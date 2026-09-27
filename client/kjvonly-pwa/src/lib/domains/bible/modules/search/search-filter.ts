export function filterBibleLocationRefsByBookID(
	refs: readonly string[],
	bookID: string | number
): string[] {
	const prefix = `${bookID}_`;

	return refs.filter((ref) =>
		ref.startsWith(prefix)
	);
}
