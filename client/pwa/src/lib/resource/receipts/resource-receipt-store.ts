import type {
	ResourceReceipt
} from './resource-receipt';

export interface ResourceReceiptStore {
	get(
		publisher: string,
		resourceId: string
	): Promise<
		ResourceReceipt |
		undefined
	>;

	put(
		receipt:
			ResourceReceipt
	): Promise<void>;

	delete(
		publisher: string,
		resourceId: string
	): Promise<void>;
}