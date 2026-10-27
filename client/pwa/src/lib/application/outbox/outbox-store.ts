import type {
	OutboxEntry,
	OutboxStatus
} from './outbox-entry';

export interface OutboxStore {
	get(
		id: string
	): Promise<
		OutboxEntry |
		undefined
	>;

	put(
		entry:
			OutboxEntry
	): Promise<void>;

	listByStatus(
		status:
			OutboxStatus
	): Promise<
		readonly OutboxEntry[]
	>;

	deleteIfCurrent(
		entry:
			OutboxEntry
	): Promise<boolean>;
}
