import { Logger } from "#ports/logging/logger.js";
import { EventSigner } from "#ports/nostr/event-signer.js";
import { NostrRelayReconciler, NostrRelayReconciliationRequest } from "#ports/nostr/nostr-relay-reconciler.js";
import { authenticateNostrToolsRelay } from "../auth/authenticate-nostr-tools-relay.js";
import { NostrToolsAuthSigner, createNostrToolsAuthSigner } from "../auth/nostr-tools-auth-signer.js";
import { NegentropyRelay, reconcileNostrToolsNegentropy, NostrToolsNegentropyError } from "../negentropy/nostr-tools-negentropy-session.js";
import { createNostrToolsNegentropyStorage } from "../negentropy/nostr-tools-negentropy-storage.js";


const NEGENTROPY_BATCH_SIZE =
	50;


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

		const missing =
			new Set<string>();

		const batchCount =
			Math.max(
				1,
				Math.ceil(
					request.events.length /
					NEGENTROPY_BATCH_SIZE
				)
			);


		for (
			let offset = 0;
			offset < Math.max(
				request.events.length,
				1
			);
			offset += NEGENTROPY_BATCH_SIZE
		) {
			const batch =
				request.events.slice(
					offset,
					offset +
						NEGENTROPY_BATCH_SIZE
				);

			const batchIndex =
				Math.floor(
					offset /
					NEGENTROPY_BATCH_SIZE
				) + 1;


			this.logReconcileBatchStart(
				request.relay,
				batchIndex,
				batchCount,
				batch.length
			);


			const batchMissing =
				await this.reconcileBatch(
					relay,
					request,
					batch
				);


			for (const eventId of batchMissing) {
				missing.add(
					eventId
				);
			}


			this.logReconcileBatchComplete(
				request.relay,
				batchIndex,
				batchCount,
				batch.length,
				batchMissing.length
			);
		}


		return [
			...missing
		];
	}


	private reconcileBatch(
		relay:
			NostrToolsRelayConnection,

		request:
			NostrRelayReconciliationRequest,

		events:
			NostrRelayReconciliationRequest['events']
	): Promise<
		readonly string[]
	> {

		const storage =
			createNostrToolsNegentropyStorage(
				events
			);


		const filter =
			events.length > 0
				? {
					ids:
						events.map(
							event =>
								event.eventId
						),

					authors: [
						request.publisher
					],

					kinds: [
						request.kind
					]
				}
				: {
					authors: [
						request.publisher
					],

					kinds: [
						request.kind
					]
				};


		return reconcileNostrToolsNegentropy(
			relay,
			storage,
			filter,
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


	private logReconcileBatchStart(
		relay:
			string,

		batchIndex:
			number,

		batchCount:
			number,

		eventCount:
			number
	): void {

		this.logger.verbose(
			'nostr.reconcile.batch.start',
			{
				relay,
				batchIndex,
				batchCount,
				eventCount
			}
		);
	}


	private logReconcileBatchComplete(
		relay:
			string,

		batchIndex:
			number,

		batchCount:
			number,

		eventCount:
			number,

		missingCount:
			number
	): void {

		this.logger.verbose(
			'nostr.reconcile.batch.complete',
			{
				relay,
				batchIndex,
				batchCount,
				eventCount,
				missingCount
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
