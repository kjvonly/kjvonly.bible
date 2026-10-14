import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { NodeNostrWebSocket } from './node-nostr-websocket.js';


describe('NodeNostrWebSocket', () => {
	it('retains an independent error listener after nostr-tools drops onerror on HTTP 504', async () => {
		const server = createServer();
		server.on('upgrade', (_request, socket) => {
			socket.end('HTTP/1.1 504 Gateway Timeout\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
		});
		await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));

		try {
			const port = (server.address() as AddressInfo).port;
			const socket = new NodeNostrWebSocket(`ws://127.0.0.1:${port}`);
			socket.onerror = () => {};
			socket.onerror = null; // Simulate cleanup by nostr-tools.
			expect(socket.listenerCount('error')).toBeGreaterThan(0);
			await new Promise<void>(resolve => socket.once('close', () => resolve()));
		} finally {
			await new Promise<void>((resolve, reject) =>
				server.close(error => error ? reject(error) : resolve())
			);
		}
	});
});
