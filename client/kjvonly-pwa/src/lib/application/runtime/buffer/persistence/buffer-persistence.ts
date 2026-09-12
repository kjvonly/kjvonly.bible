import {
	Buffer
} from '$lib/application/runtime/buffer/models/buffer.model';

import {
	Modules
} from '$lib/application/models/modules.model';

import {
	parseResourceSelections,
	type ResourceSelections
} from '$lib/application/resources/resource-selections';

export interface PersistedBuffer {
	key: string;
	name: string;
	componentName: Modules;
	selected: boolean;
	bag: any;
	resourceSelections: ResourceSelections;
}

export function serializeBuffer(
	buffer:
		Pick<
			Buffer,
			| 'key'
			| 'name'
			| 'componentName'
			| 'selected'
			| 'bag'
			| 'resourceSelections'
		>
): PersistedBuffer {
	return {
		key:
			buffer.key,

		name:
			buffer.name,

		componentName:
			buffer.componentName,

		selected:
			buffer.selected,

		bag:
			buffer.bag,

		resourceSelections:
			copyResourceSelections(
				buffer.resourceSelections
			)
	};
}

export function restoreBuffer(
	value: unknown
): Buffer {
	const persisted =
		parsePersistedBuffer(
			value
		);

	const buffer =
		new Buffer(
			persisted.resourceSelections
		);

	buffer.key =
		persisted.key;

	buffer.name =
		persisted.name;

	buffer.componentName =
		persisted.componentName;

	buffer.selected =
		persisted.selected;

	buffer.bag =
		persisted.bag;

	return buffer;
}

function parsePersistedBuffer(
	value: unknown
): PersistedBuffer {
	if (
		typeof value !== 'object' ||
		value === null ||
		Array.isArray(
			value
		)
	) {
		throw new Error(
			'Invalid persisted Buffer'
		);
	}

	const persisted =
		value as
			Record<string, unknown>;

	if (
		typeof persisted.key !==
			'string' ||
		persisted.key.length === 0
	) {
		throw new Error(
			'Invalid persisted Buffer key'
		);
	}

	if (
		typeof persisted.name !==
			'string'
	) {
		throw new Error(
			'Invalid persisted Buffer name'
		);
	}

	if (
		!isModule(
			persisted.componentName
		)
	) {
		throw new Error(
			'Invalid persisted Buffer module'
		);
	}

	if (
		typeof persisted.selected !==
			'boolean'
	) {
		throw new Error(
			'Invalid persisted Buffer selected state'
		);
	}

	return {
		key:
			persisted.key,

		name:
			persisted.name,

		componentName:
			persisted.componentName,

		selected:
			persisted.selected,

		bag:
			persisted.bag ?? {},

		resourceSelections:
			parseResourceSelections(
				persisted.resourceSelections ??
				{}
			)
	};
}

function isModule(
	value: unknown
): value is Modules {
	return (
		typeof value === 'number' &&
		Object.values(
			Modules
		).includes(
			value as Modules
		)
	);
}

function copyResourceSelections(
	selections:
		ResourceSelections
): ResourceSelections {
	const result:
		ResourceSelections =
		{};

	for (
		const [
			resourceType,
			reference
		] of Object.entries(
			selections
		)
	) {
		result[
			resourceType
		] = {
			...reference
		};
	}

	return result;
}
