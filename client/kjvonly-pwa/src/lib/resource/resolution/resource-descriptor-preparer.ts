import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	ResourceDescriptorValidator
} from '$lib/resource/descriptors/resource-descriptor-validator';

import type {
	ResourceDescriptorCurrentness
} from './resource-descriptor-currentness';


/**
 * Result of validating a descriptor entry and evaluating Resource currentness.
 */
export type ResourceDescriptorPreparation =
	| {
		readonly status:
			'ready';

		readonly descriptor:
			ResourceDescriptor;
	}
	| {
		readonly status:
			'current';

		readonly descriptor:
			ResourceDescriptor;
	}
	| {
		readonly status:
			'failed';

		readonly descriptor:
			ResourceDescriptor |
			undefined;

		readonly error:
			unknown;
	};


/**
 * Prepares one untrusted descriptor entry for Resource resolution.
 *
 * Validation establishes a trusted ResourceDescriptor. Currentness then decides
 * whether that descriptor still requires retrieval. Byte resolution and nested
 * descriptor traversal remain separate responsibilities.
 */
export class ResourceDescriptorPreparer {
	constructor(
		private readonly descriptorValidator:
			Pick<
				ResourceDescriptorValidator,
				'validate'
			>,

		private readonly descriptorCurrentness:
			Pick<
				ResourceDescriptorCurrentness,
				'needsProcessing'
			>
	) {}

	/**
	 * Validates one raw descriptor entry and determines whether it needs
	 * processing without retrieving its content.
	 */
	async prepare(
		value: unknown
	): Promise<
		ResourceDescriptorPreparation
	> {
		let descriptor:
			ResourceDescriptor |
			undefined;

		try {
			descriptor =
				this.descriptorValidator.validate(
					value
				);

			const shouldProcess =
				await this.descriptorCurrentness.needsProcessing(
					descriptor
				);

			if (!shouldProcess) {
				return {
					status:
						'current',

					descriptor
				};
			}

			return {
				status:
					'ready',

				descriptor
			};
		} catch (error) {
			return {
				status:
					'failed',

				descriptor,
				error
			};
		}
	}
}
