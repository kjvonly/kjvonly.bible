export interface ResourceReceipt {
	readonly id: string;

	readonly publisher: string;

	readonly resourceId: string;

	readonly modifiedAt: number;
}

export function createResourceReceiptId(
	publisher: string,
	resourceId: string
): string {
	return `${publisher}:${resourceId}`;
}