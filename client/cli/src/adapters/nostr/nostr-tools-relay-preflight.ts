import { Logger } from '../../ports/logging/logger.js';
import { PublicationEndpointPreflight } from '../../ports/publication/publication-endpoint-preflight.js';
import {
	connectNodeNostrToolsRelay
} from './connect-node-nostr-tools-relay.js';

import type {
	NostrToolsRelayConnector
} from './nostr-tools-relay-reconciler.js';


export interface NostrPreflightData {
	readonly relays:
	readonly string[];
}


export class NostrToolsRelayPreflight
	implements PublicationEndpointPreflight {

	constructor(
		private readonly logger:
			Logger,

		private readonly connectRelay:
			NostrToolsRelayConnector =
			connectNodeNostrToolsRelay
	) { }


	async check(
		data:
			unknown
	): Promise<void> {

		const config =
			data as NostrPreflightData;


		await Promise.all(
			config.relays.map(
				url =>
					this.checkRelay(
						url
					)
			)
		);
	}


	private async checkRelay(
		url:
			string
	): Promise<void> {

		this.logCheckStart(
			url
		);


		try {
			const relay =
				await this.connectRelay(
					url
				);


			relay.close();
		}
		catch (
		error:
			unknown
		) {
			throw new Error(
				`Unable to reach Nostr relay "${url}": ${error instanceof Error
					? error.message
					: String(
						error
					)
				}`
			);
		}


		this.logCheckComplete(
			url
		);
	}

	///////////////////////////////////////////////////////////////////////////
	// Log Helpers

	private logCheckStart(
		url:
			string
	): void {

		this.logger.verbose(
			'preflight.relay.start',
			{
				url
			}
		);
	}


	private logCheckComplete(
		url:
			string
	): void {

		this.logger.verbose(
			'preflight.relay.complete',
			{
				url
			}
		);
	}
}