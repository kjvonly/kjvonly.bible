import {
	Relay,
	useWebSocketImplementation
} from 'nostr-tools/relay';
import { NodeNostrWebSocket } from '../transport/node-nostr-websocket.js';


useWebSocketImplementation(
	NodeNostrWebSocket
);

export async function connectNodeNostrToolsRelay(
	url:
		string
) {

	return Relay.connect(
		url
	);
}