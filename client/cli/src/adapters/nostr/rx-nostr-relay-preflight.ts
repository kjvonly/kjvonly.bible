import {
	filter,
	firstValueFrom,
	timeout
} from 'rxjs';

import type {
	PublicationEndpointPreflight
} from '../../ports/publication-endpoint-preflight.js';

import {
	createNodeRxNostr
} from './create-node-rx-nostr.js';


const PREFLIGHT_TIMEOUT_MS =
	5_000;


export class RxNostrRelayPreflight
	implements PublicationEndpointPreflight {

	async check(
		url:
			string
	): Promise<void> {

		const rxNostr =
			createNodeRxNostr({
				connectionStrategy:
					'aggressive'
			});


		try {
			const statePromise =
				firstValueFrom(
					rxNostr
						.createConnectionStateObservable()
						.pipe(
							filter(
								packet =>
									packet.state ===
										'connected' ||
									packet.state ===
										'error' ||
									packet.state ===
										'rejected'
							),

							timeout({
								first:
									PREFLIGHT_TIMEOUT_MS
							})
						)
				);


			rxNostr.setDefaultRelays([
				url
			]);


			const packet =
				await statePromise;


			if (
				packet.state !==
					'connected'
			) {
				throw new Error(
					`Relay entered state "${packet.state}".`
				);
			}
		}
		catch (
			error:
				unknown
		) {
			throw new Error(
				`Unable to reach Nostr relay "${url}": ${
					error instanceof Error
						? error.message
						: String(
							error
						)
				}`
			);
		}
		finally {
			rxNostr.dispose();
		}
	}
}