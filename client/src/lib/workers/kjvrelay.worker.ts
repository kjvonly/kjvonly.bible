async function decompressGzipBytes(uint8Array: Uint8Array) {
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


// const bytes = Uint8Array.from(atob(base64String), c => c.charCodeAt(0));

async function gzipAndBase64Encode(text: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(data);
  writer.close();

  const compressedBlob = await new Response(cs.readable).blob();
  const reader = new FileReader();
  reader.readAsDataURL(compressedBlob);

  return new Promise((resolve) => {
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        const base64Data = reader.result.split(',')[1]; // Extract base64 part
        resolve(base64Data);
      }
    };
  });
}
let socket = null;

function connect(url: string) {
  socket = new WebSocket(url);

  socket.onopen = () => {
    self.postMessage({ type: 'connected' });
  };

  socket.onmessage = (event) => {
    self.postMessage({ type: 'data', payload: event.data });
  };

  socket.onerror = (error: Event) => {
    self.postMessage({ type: 'error', payload: error });
  };

  socket.onclose = () => {
    self.postMessage({ type: 'closed' });
  };
}

self.onmessage = (event) => {
  if (event.data.type === 'connect') {
    connect(event.data.url);
  }
};   
