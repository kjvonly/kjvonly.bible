/** Decompress one stored Dictionary gzip chunk entirely inside a worker. */
export async function decompressDictionaryChunk(gzip: Uint8Array): Promise<string> {
	const stream = new Blob([new Uint8Array(gzip)]).stream()
		.pipeThrough(new DecompressionStream('gzip'));
	const bytes = await new Response(stream).arrayBuffer();
	return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
