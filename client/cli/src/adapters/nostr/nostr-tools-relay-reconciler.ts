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
	EventSigner
} from '../../ports/event-signer.js';

import type {
	Logger
} from '../../ports/logger.js';

import type {
	NostrRelayReconciler,
	NostrRelayReconciliationRequest
} from '../../ports/nostr-relay-reconciler.js';


export interface NostrToolsRelayConnection
	extends NegentropyRelay {

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
			NostrToolsRelayConnector,

		private readonly logger:
			Logger
	) { }


	async reconcile(
		request:
			NostrRelayReconciliationRequest
	): Promise<
		readonly string[]
	> {

		this.logConnectStart(
			request.relay
		);


		const relay =
			await this.connectRelay(
				request.relay
			);


		this.logConnectComplete(
			request.relay
		);


		this.logReconcileStart(
			request
		);


		try {
			try {
				const missing =
					await this.reconcileOnce(
						relay,
						request
					);


				this.logReconcileComplete(
					request.relay,
					missing.length
				);


				return missing;
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


				this.logAuthRequired(
					request.relay
				);


				this.logAuthStart(
					request.relay
				);


				await authenticateNostrToolsRelay(
					relay,
					createNostrToolsAuthSigner(
						this.signer
					)
				);


				this.logAuthComplete(
					request.relay
				);


				this.logReconcileRetry(
					request.relay
				);


				const missing =
					await this.reconcileOnce(
						relay,
						request
					);


				this.logReconcileComplete(
					request.relay,
					missing.length
				);


				return missing;
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
			},
			this.logger
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


	private logConnectStart(
		relay:
			string
	): void {

		this.logger.verbose(
			'nostr.connect.start',
			{
				relay
			}
		);
	}


	private logConnectComplete(
		relay:
			string
	): void {

		this.logger.verbose(
			'nostr.connect.complete',
			{
				relay
			}
		);
	}


	private logReconcileStart(
		request:
			NostrRelayReconciliationRequest
	): void {

		this.logger.verbose(
			'nostr.reconcile.start',
			{
				relay:
					request.relay,

				kind:
					request.kind,

				eventCount:
					request.events.length
			}
		);
	}


	private logAuthRequired(
		relay:
			string
	): void {

		this.logger.verbose(
			'nostr.auth.required',
			{
				relay
			}
		);
	}


	private logAuthStart(
		relay:
			string
	): void {

		this.logger.verbose(
			'nostr.auth.start',
			{
				relay
			}
		);
	}


	private logAuthComplete(
		relay:
			string
	): void {

		this.logger.verbose(
			'nostr.auth.complete',
			{
				relay
			}
		);
	}


	private logReconcileRetry(
		relay:
			string
	): void {

		this.logger.verbose(
			'nostr.reconcile.retry',
			{
				relay
			}
		);
	}


	private logReconcileComplete(
		relay:
			string,

		missingCount:
			number
	): void {

		this.logger.verbose(
			'nostr.reconcile.complete',
			{
				relay,
				missingCount
			}
		);
	}
}