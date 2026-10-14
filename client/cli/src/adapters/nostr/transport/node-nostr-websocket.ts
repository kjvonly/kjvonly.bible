import WebSocket from 'ws';


/**
 * Node's `ws` can emit an asynchronous `error` after a failed handshake.
 * nostr-tools may already have detached its `onerror` handler while closing
 * that connection, leaving the EventEmitter error unhandled and crashing the
 * CLI. Retain an independent listener without interfering with nostr-tools'
 * own error handling.
 */
export class NodeNostrWebSocket extends WebSocket {
	constructor(
		address: string | URL,
		protocols?: string | string[],
		options?: WebSocket.ClientOptions
	) {
		super(address, protocols, options);
		this.on('error', () => {
			// The Nostr relay adapter handles the original transport failure.
		});
	}
}
