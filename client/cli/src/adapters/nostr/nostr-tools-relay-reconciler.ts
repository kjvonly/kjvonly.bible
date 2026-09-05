import {
	authenticateNostrToolsRelay
} from './authenticate-nostr-tools-relay.js';

import {
	createNostrToolsAuthSigner
} from './nostr-tools-auth-signer.js';

import {
	createNostrToolsNegentropyStorage
} from './nostr-tools-negentropy-storage.js';

import {
	NostrToolsNegentropyError,
	reconcileNostrToolsNegentropy
} from './nostr-tools-negentropy-session.js';

import type {
	NegentropyRelay
} from './nostr-tools-negentropy-session.js';

import type {
	NostrToolsAuthSigner
} from './nostr-tools-auth-signer.js';

import type {
	SignedNostrEvent
} from '../../domain/nostr-event.js';

import type {
	EventSigner
} from '../../ports/event-signer.js';

import type {
	NostrRelayReconciler,
	NostrRelayReconciliationRequest
} from '../../ports/nostr-relay-reconciler.js';


export interface NostrToolsRelayConnection
	extends NegentropyRelay {

	publish(
		event:
			SignedNostrEvent
	): Promise<string>;


	auth(
		signAuthEvent:
			NostrToolsAuthSigner
	): Promise<string>;


	close():
		void;
}


export type NostrToolsRelayConnector =
	(
		url:
			string
	) => Promise<
		NostrToolsRelayConnection
	>;


export class NostrToolsRelayReconciler
	implements NostrRelayReconciler {

	constructor(
		private readonly signer:
			EventSigner,

		private readonly connectRelay:
			NostrToolsRelayConnector
	) {}


	async reconcile(
		request:
			NostrRelayReconciliationRequest
	): Promise<
		readonly string[]
	> {

		const relay =
			await this.connectRelay(
				request.relay
			);


		try {
			try {
				return await this.reconcileOnce(
					relay,
					request
				);
			}
			catch (
				error:
					unknown
			) {
				if (
					!this.isAuthRequired(
						error
					)
				) {
					throw error;
				}


				await authenticateNostrToolsRelay(
					relay,
					createNostrToolsAuthSigner(
						this.signer
					)
				);


				return await this.reconcileOnce(
					relay,
					request
				);
			}
		}
		finally {
			relay.close();
		}
	}


	private async reconcileOnce(
		relay:
			NostrToolsRelayConnection,

		request:
			NostrRelayReconciliationRequest
	): Promise<
		readonly string[]
	> {

		const storage =
			createNostrToolsNegentropyStorage(
				request.events
			);


		return reconcileNostrToolsNegentropy(
			relay,
			storage,
			{
				authors: [
					request.publisher
				],

				kinds: [
					request.kind
				]
			}
		);
	}


	private isAuthRequired(
		error:
			unknown
	): boolean {

		return (
			error instanceof
				NostrToolsNegentropyError &&
			error.reason.startsWith(
				'auth-required:'
			)
		);
	}
}