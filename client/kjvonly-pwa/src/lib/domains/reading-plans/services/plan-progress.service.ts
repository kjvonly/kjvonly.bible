import type {
	PlanProgress
} from '$lib/domains/reading-plans/models/plan-progress';

import type {
	PlanProgressStore
} from '$lib/domains/reading-plans/persistence/plan-progress-store';

import type {
	PlanProgressWriteTransaction
} from '$lib/domains/reading-plans/resources/progress/plan-progress-write-stores';

import type {
	PlanProgressResourcePublication
} from '$lib/domains/reading-plans/resources/progress/plan-progress-resource-publication';

import type {
	OutboxWakeup
} from '$lib/application/outbox/outbox-wakeup';

export class PlanProgressService {

	constructor(
		private readonly progress:
			Pick<
				PlanProgressStore,
				'get' | 'getAll'
			>,

		private readonly writeTransaction:
			PlanProgressWriteTransaction,

		private readonly resourcePublication:
			Pick<
				PlanProgressResourcePublication,
				'create'
			>,

		private readonly outbox:
			OutboxWakeup
	) {}

	async get(
		subscriptionId: string
	): Promise<
		PlanProgress |
		undefined
	> {
		return await this.progress.get(
			subscriptionId
		);
	}

	async list(): Promise<
		readonly PlanProgress[]
	> {
		return await this.progress.getAll();
	}

	async completeReading(
		subscriptionId: string,
		readingIndex: number
	): Promise<PlanProgress> {
		validateReadingIndex(
			readingIndex
		);

		let changed =
			false;

		const progress =
			await this.writeTransaction.run(
				async (
					stores
				) => {
					const existing =
						await stores
							.progress
							.get(
								subscriptionId
							);

					if (
						existing?.completedReadingIndexes
							.includes(
								readingIndex
							)
					) {
						return existing;
					}

					const updated:
						PlanProgress = {
							id:
								subscriptionId,
							completedReadingIndexes: [
								...(
									existing
										?.completedReadingIndexes ??
									[]
								),
								readingIndex
							].sort(
								(a, b) =>
									a - b
							)
						};

					const publication =
						this.resourcePublication
							.create(
								updated
							);

					await stores
						.progress
						.put(
							updated
						);

					await stores
						.outbox
						.put(
							updated.id,
							publication
						);

					changed =
						true;

					return updated;
				}
			);

		if (changed) {
			this.outbox.wake();
		}

		return progress;
	}
}

function validateReadingIndex(
	readingIndex: number
): void {
	if (
		!Number.isSafeInteger(
			readingIndex
		) ||
		readingIndex < 0
	) {
		throw new Error(
			`Invalid Plan reading index: ${readingIndex}`
		);
	}
}
