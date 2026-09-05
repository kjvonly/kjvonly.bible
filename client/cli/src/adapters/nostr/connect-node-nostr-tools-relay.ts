import WebSocket from 'ws';

import {
	Relay,
	useWebSocketImplementation
} from 'nostr-tools/relay';

import type {
	NostrToolsRelayConnector
} from './nostr-tools-relay-reconciler.js';


useWebSocketImplementation(
	WebSocket
);


export const connectNodeNostrToolsRelay:
	NostrToolsRelayConnector =
		async (
			url:
				string
		) =>
			Relay.connect(
				url
			);