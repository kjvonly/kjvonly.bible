import type {
	NostrReconciliationEntry
} from '../../domain/nostr-reconciliation-entry.js';


export interface NostrRelayReconciliationRequest {
	readonly relay:
		string;

	readonly publisher:
		string;

	readonly kind:
		number;

	readonly events:
		readonly NostrReconciliationEntry[];
}


export interface NostrRelayReconciler {
	reconcile(
		request:
			NostrRelayReconciliationRequest
	): Promise<
		readonly string[]
	>;
}