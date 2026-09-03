export async function hexDecodeAndUngzip(hexString: string): Promise<string> {
  // Remove any whitespace and ensure even length
  hexString = hexString.trim();
  if (hexString.length % 2 !== 0) {
    throw new Error("Hex string must have an even number of characters");
  }

  // Convert hex string to Uint8Array
  const bytes = hexDecode(hexString)
  const arrayBuffer = bytes.buffer;

  // Decompress using DecompressionStream
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(arrayBuffer);
  writer.close();

  const decompressedArrayBuffer = await new Response(ds.readable).arrayBuffer();
  return new TextDecoder().decode(decompressedArrayBuffer);
}

export function hexDecode(hexString: string): Uint8Array {
  return new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
}

export async function gzipAndHexEncode(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(data);
  writer.close();

  const compressedBlob = await new Response(cs.readable).blob();
  const arrayBuffer = await compressedBlob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  return hexEncode(uint8Array)
}

export function hexEncode(uint8Array): string {
  return Array.from(uint8Array)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}
export async function gzipAndBase64Encode(text: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(data);
  writer.close();

  const compressedBlob = await new Response(cs.readable).blob();
  const reader = new FileReader();
  reader.readAsDataURL(compressedBlob)

  return new Promise((resolve) => {
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        const base64Data = reader.result.split(',')[1]; // Extract base64 part
        resolve(base64Data);
      }
    };
  });
}
export async function decompressGzipBytes(uint8Array: Uint8Array) {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(uint8Array);
      controller.close();
    }
  });

  const ds = new DecompressionStream('gzip');
  const decompressedStream = stream.pipeThrough(ds);
  const result = await new Response(decompressedStream).arrayBuffer();
  return new TextDecoder().decode(result); // or JSON.parse() if result is JSON
}

export async function downloadAndDecompressGzip(url: string) {
  const response = await fetch(url);
  const compressedBlob = await response.blob();

  const ds = new DecompressionStream('gzip');
  const decompressedStream = compressedBlob.stream().pipeThrough(ds);
  const decompressedBlob = await new Response(decompressedStream).blob();

  const text = await decompressedBlob.text();
  return text;
}
