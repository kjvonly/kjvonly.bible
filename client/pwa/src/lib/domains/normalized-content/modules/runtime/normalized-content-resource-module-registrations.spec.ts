import {
	describe,
	expect,
	it
} from 'vitest';

import {
	Modules,
	ResourceModuleResolver
} from '$lib/application';

import type {
	ResourceDescriptor
} from '$lib/resource';

import {
	NORMALIZED_CONTENT_VIEWS
} from '../../models/normalized-content-navigation.model';

import {
	NORMALIZED_CONTENT_RESOURCE_TYPE,
	NORMALIZED_DOCUMENT_DATA_TYPE,
	NORMALIZED_DOCUMENT_DATA_VERSION
} from '../../resources/normalized-content-resource-contract';

import {
	normalizedContentResourceModuleRegistrations
} from './normalized-content-resource-module-registrations';

function descriptor(
	overrides: Partial<ResourceDescriptor['metadata']> = {}
): ResourceDescriptor {
	return {
		metadata: {
			publisher: 'publisher',
			resourceId: 'commentary/matthew/1',
			resourceType: NORMALIZED_CONTENT_RESOURCE_TYPE,
			dataType: NORMALIZED_DOCUMENT_DATA_TYPE,
			dataVersion: NORMALIZED_DOCUMENT_DATA_VERSION,
			modifiedAt: 1,
			representation: 'content',
			mediaType: 'application/json',
			...overrides
		},
		strategy: {
			type: 'inline',
			data: null
		}
	};
}

const resolver = new ResourceModuleResolver(
	normalizedContentResourceModuleRegistrations
);

describe('Normalized Content Resource Module registration', () => {
	it('opens a standalone normalized document in the Reader with the exact descriptor', () => {
		const resource = descriptor();
		const destination = resolver.resolve(resource);

		expect(destination.module).toBe(Modules.NORMALIZED_CONTENT);
		expect(destination.view).toBe(NORMALIZED_CONTENT_VIEWS.READER);
		expect(destination.state).toEqual({ descriptor: resource });
		expect(destination.state.descriptor).toBe(resource);
	});

	it('preserves optional file presentation context separately from the descriptor', () => {
		const resource = descriptor();
		const destination = resolver.resolve(resource, { fileName: 'Genesis-1.nd.json' });

		expect(destination.state).toEqual({
			descriptor: resource,
			fileName: 'Genesis-1.nd.json'
		});
		expect(resource.metadata).not.toHaveProperty('name');
	});

	it('accepts a generic ordered sequence while keeping initial descriptor identity', () => {
		const first = descriptor({ resourceId: 'commentary/1' });
		const second = descriptor({ resourceId: 'commentary/2' });
		const sequence = {
			items: [
				{ descriptor: first, fileName: '1.nd.json' },
				{ descriptor: second, fileName: '2.nd.json' }
			],
			index: 1
		};
		const destination = resolver.resolve(second, { fileName: '2.nd.json', sequence });
		expect(destination.state).toEqual({
			descriptor: second,
			fileName: '2.nd.json',
			sequence: sequence.items,
			sequenceIndex: 1
		});
	});

	it('does not claim another Domain Resource with the same semantic data type', () => {
		expect(() => resolver.resolve(
			descriptor({ resourceType: 'bible/chapter' })
		)).toThrow('No Module registered for Resource');
	});

	it('rejects an incompatible normalized-document data type', () => {
		expect(() => resolver.resolve(
			descriptor({ dataType: 'kjvonly.audio' })
		)).toThrow('No Module registered for Resource');
	});

	it('rejects an unsupported normalized-document data version', () => {
		expect(() => resolver.resolve(
			descriptor({ dataVersion: 2 })
		)).toThrow('No Module registered for Resource');
	});
});
