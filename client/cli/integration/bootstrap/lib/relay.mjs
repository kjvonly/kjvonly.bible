import WebSocket from 'ws';

import {
	finalizeEvent
} from 'nostr-tools/pure';

import {
	Relay,
	useWebSocketImplementation
} from 'nostr-tools/relay';


useWebSocketImplementation(
	WebSocket
);


class SubscriptionClosedError
	extends Error {

	constructor(
		reason
	) {
		super(
			reason
		);

		this.name =
			'SubscriptionClosedError';
	}
}


export async function queryEventsByKind({
	relayUrl,
	kind
}) {
	const relay =
		await Relay.connect(
			relayUrl
		);

	try {
		let authenticated =
			false;

		while (
			true
		) {
			try {
				return await collectEvents(
					relay,
					{
						kinds: [
							kind
						]
					}
				);
			}
			catch (
				error
			) {
				if (
					!(
						error instanceof
							SubscriptionClosedError
					) ||
					!error.message.startsWith(
						'auth-required:'
					) ||
					authenticated
				) {
					throw error;
				}

				await relay.auth(
					createAuthSigner()
				);

				authenticated =
					true;
			}
		}
	}
	finally {
		relay.close();
	}
}


function collectEvents(
	relay,
	filter
) {
	return new Promise(
		(resolve, reject) => {
			const events = [];
			let settled =
				false;

			let subscription;

			const settle =
				operation => {
					if (
						settled
					) {
						return;
					}

					settled =
						true;

					operation();
				};

			subscription =
				relay.subscribe(
					[
						filter
					],
					{
						onevent(
							event
						) {
							events.push(
								event
							);
						},

						oneose() {
							settle(
								() => {
									subscription?.close();
									resolve(
										events
									);
								}
							);
						},

						onclose(
							reason
						) {
							settle(
								() => {
									reject(
										new SubscriptionClosedError(
											reason
										)
									);
								}
							);
						}
					}
				);
		}
	);
}


function createAuthSigner() {
	const secretKeyHex =
		process.env.NOSTR_SECRET_KEY;

	if (
		secretKeyHex === undefined ||
		!/^[0-9a-fA-F]{64}$/.test(
			secretKeyHex
		)
	) {
		throw new Error(
			'NOSTR_SECRET_KEY must be a 64-character hex key when the relay requires NIP-42 authentication.'
		);
	}

	const secretKey =
		Buffer.from(
			secretKeyHex,
			'hex'
		);

	return eventTemplate =>
		finalizeEvent(
			eventTemplate,
			secretKey
		);
}
