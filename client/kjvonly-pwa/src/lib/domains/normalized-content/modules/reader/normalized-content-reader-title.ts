/** Reader heading prefers the opened filesystem filename, not Resource identity. */
export function resolveNormalizedContentReaderTitle(
	descriptor: unknown,
	fileName?: string
): string {
	const name = fileName?.trim();
	if (name) {
		// `.nd.json` is one compound extension; strip it completely.
		const withoutExtension = name
			.replace(/\.nd\.json$/i, '')
			.replace(/\.[^./]+$/, '')
			.trim();
		return withoutExtension || name;
	}

	const metadata = isRecord(descriptor) && isRecord(descriptor.metadata)
		? descriptor.metadata
		: undefined;
	const metadataName = metadata?.name;
	return typeof metadataName === 'string' && metadataName.trim()
		? metadataName.trim()
		: 'Document';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
