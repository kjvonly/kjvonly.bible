import {
	Buffer
} from './models/buffer.model';

import type {
	Modules
} from '$lib/application/models/modules.model';

import type {
	ResourceSelections
} from '$lib/application/resources/resource-selections';

import type {
	BufferBag
} from './models/buffer-bag.model';

export interface ModuleResourceSelectionsBuilder {
	independent(
		module: Modules
	): ResourceSelections;

	related(
		module: Modules,
		originatingSelections:
			ResourceSelections
	): ResourceSelections;

	reconcileRestored(
		module: Modules,
		restoredSelections:
			ResourceSelections
	): ResourceSelections;
}

export class ModuleBufferFactory {
	constructor(
		private readonly selections:
			ModuleResourceSelectionsBuilder
	) {}

	independent(
		module: Modules,
		bag: BufferBag = {}
	): Buffer {
		return this.create(
			module,
			this.selections.independent(
				module
			),
			bag
		);
	}

	related(
		module: Modules,
		originatingBuffer:
			Pick<
				Buffer,
				'resourceSelections'
			>,
		bag: BufferBag = {}
	): Buffer {
		return this.create(
			module,
			this.selections.related(
				module,
				originatingBuffer
					.resourceSelections
			),
			bag
		);
	}

	reconcileRestored(
		buffer: Buffer
	): void {
		buffer.resourceSelections =
			this.selections
				.reconcileRestored(
					buffer.componentName,
					buffer.resourceSelections
				);
	}

	private create(
		module: Modules,
		resourceSelections:
			ResourceSelections,
		bag: BufferBag
	): Buffer {
		const buffer =
			new Buffer(
				resourceSelections
			);

		buffer.componentName =
			module;

		buffer.bag =
			copyNavigationContext(
				bag
			);

		return buffer;
	}
}

function copyNavigationContext(
	bag: BufferBag
): BufferBag {
	return {
		...bag
	};
}
