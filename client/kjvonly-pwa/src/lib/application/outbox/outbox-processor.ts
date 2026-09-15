import type {
	OutboxEntry
} from './outbox-entry';

import type {
	OutboxPublicationStrategy
} from './outbox-publication-strategy';

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

	private readonly publicationStrategies:
		ReadonlyMap<
			string,
			OutboxPublicationStrategy
		>;

	constructor(
		private readonly store:
			OutboxStore,

		publicationStrategies:
			readonly OutboxPublicationStrategy[]
	) {
		const strategies =
			new Map<
				string,
				OutboxPublicationStrategy
			>();

		for (
			const strategy of
				publicationStrategies
		) {
			if (
				strategies.has(
					strategy.type
				)
			) {
				throw new Error(
					`Duplicate Outbox publication strategy: ${strategy.type}`
				);
			}

			strategies.set(
				strategy.type,
				strategy
			);
		}

		this.publicationStrategies =
			strategies;
	}

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
				await this.publish(
					entry
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

	private async publish(
		entry:
			OutboxEntry
	): Promise<void> {
		const strategy =
			this.publicationStrategies
				.get(
					entry.publication.type
				);

		if (!strategy) {
			throw new Error(
				`No Outbox publication strategy registered for type: ${entry.publication.type}`
			);
		}

		await strategy.publish(
			entry.publication
		);
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
