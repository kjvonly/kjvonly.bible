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
	componentName: Modules;
	bag: unknown;
	resourceSelections: ResourceSelections;
}

export function serializeBuffer(
	buffer:
		Pick<
			Buffer,
			| 'key'
			| 'componentName'
			| 'bag'
			| 'resourceSelections'
		>
): PersistedBuffer {
	return {
		key:
			buffer.key,

		componentName:
			buffer.componentName,

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

	buffer.componentName =
		persisted.componentName;

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
		!isModule(
			persisted.componentName
		)
	) {
		throw new Error(
			'Invalid persisted Buffer module'
		);
	}

	return {
		key:
			persisted.key,

		componentName:
			persisted.componentName,

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
