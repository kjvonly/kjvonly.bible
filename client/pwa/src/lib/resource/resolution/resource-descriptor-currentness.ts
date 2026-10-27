import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	ResourceReceiptService
} from '$lib/resource/receipts/resource-receipt.service';


/**
 * Adapts Resource receipt currentness checks to ResourceDescriptor metadata.
 *
 * It owns extraction of Resource identity and revision from the descriptor, but
 * does not decide how callers represent or aggregate a current result.
 */
export class ResourceDescriptorCurrentness {
	constructor(
		private readonly receiptService:
			Pick<
				ResourceReceiptService,
				'needsProcessing'
			>
	) {}

	/**
	 * Returns whether the descriptor revision still requires processing.
	 */
	needsProcessing(
		descriptor:
			ResourceDescriptor
	): Promise<boolean> {
		return this.receiptService.needsProcessing(
			descriptor.metadata.publisher,
			descriptor.metadata.resourceId,
			descriptor.metadata.modifiedAt
		);
	}
}
