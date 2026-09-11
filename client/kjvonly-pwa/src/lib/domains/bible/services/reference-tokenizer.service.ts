export function tokenizeReferences(
	references: readonly string[]
): string[] {
	return references.flatMap((reference) =>
		reference
			.split(';')
			.map((token) => token.trim())
			.filter((token) => token.length > 0)
	);
}

export function isStrongsReference(
	reference: string
): boolean {
	return /^[GH]\d+$/i.test(reference);
}

export function isFootnoteReference(
	reference: string
): boolean {
	return /^\d+_\d+_\d+$/.test(reference);
}

export function isCrossReference(
	reference: string
): boolean {
	return /^\d+\/\d+\/\d+$/.test(reference);
}
