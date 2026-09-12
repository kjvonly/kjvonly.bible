import type {
	ResourcePublisher
} from '$lib/resource/publication/resource-publisher';

import type {
	OutboxStore
} from './outbox-store';

import type {
	OutboxWakeup
} from './outbox-wakeup';

export class OutboxProcessor
	implements OutboxWakeup {
	private processing =
		false;

	private wakeRequested =
		false;

	constructor(
		private readonly store:
			OutboxStore,

		private readonly publisher:
			ResourcePublisher
	) {}


	wake(): void {
		this.wakeRequested =
			true;

		if (
			this.processing
		) {
			return;
		}

		this.processing =
			true;

		void this.processWakeLoop();
	}

	async processPending():
		Promise<void> {
		const entries =
			await this.store.listByStatus(
				'pending'
			);

		for (const entry of entries) {
			try {
				await this.publisher.publish(
					entry.resource
				);

				await this.store
					.deleteIfCurrent(
						entry
					);
			} catch {
				// The durable pending entry remains available
				// for a later retry.
			}
		}
	}

	private async processWakeLoop():
		Promise<void> {
		try {
			while (
				this.wakeRequested
			) {
				this.wakeRequested =
					false;

				try {
					await this.processPending();
				} catch {
					/*
					 * Pending entries remain durable.
					 * A later wake can retry them.
					 */
				}
			}
		} finally {
			this.processing =
				false;

			if (
				this.wakeRequested
			) {
				this.wake();
			}
		}
	}

}
