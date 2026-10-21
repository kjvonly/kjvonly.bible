/** Compress one size-bounded JSON chunk in the existing Resource Worker. */
export async function gzipDictionaryChunk(json: string): Promise<Uint8Array> {
	const compressed = new Blob([json])
		.stream()
		.pipeThrough(new CompressionStream('gzip'));
	return new Uint8Array(await new Response(compressed).arrayBuffer());
}
