import WebSocket from 'ws';

import {
	Relay,
	useWebSocketImplementation
} from 'nostr-tools/relay';


useWebSocketImplementation(
	WebSocket
);

export async function connectNodeNostrToolsRelay(
	url:
		string
) {

	return Relay.connect(
		url
	);
}