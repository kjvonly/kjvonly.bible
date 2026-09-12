import {
	Buffer
} from './models/buffer.model';

import type {
	Modules
} from '$lib/application/models/modules.model';

import type {
	ResourceSelections
} from '$lib/application/resources/resource-selections';

export interface ModuleResourceSelectionsBuilder {
	independent(
		module: Modules
	): ResourceSelections;

	related(
		module: Modules,
		originatingSelections:
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
		bag: any = {}
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
		bag: any = {}
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

	private create(
		module: Modules,
		resourceSelections:
			ResourceSelections,
		bag: any
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
	bag: any
): any {
	if (
		bag === null ||
		typeof bag !==
			'object'
	) {
		return bag;
	}

	if (
		Array.isArray(
			bag
		)
	) {
		return [
			...bag
		];
	}

	return {
		...bag
	};
}
