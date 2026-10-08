import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	ResourceDescriptor
} from '$lib/resource';

import type {
	NormalizedDocument
} from '@kjvonly/normalized-content';

import {
	createNormalizedDocumentIdForDescriptor
} from '../models/normalized-document-id';

import {
	NORMALIZED_CONTENT_RESOURCE_TYPE,
	NORMALIZED_DOCUMENT_DATA_TYPE,
	NORMALIZED_DOCUMENT_DATA_VERSION
} from '../resources/normalized-content-resource-contract';

import {
	NormalizedContentService
} from './normalized-content.service';

class FakeStore {
	get =
		vi.fn<
			(id: string) => Promise<NormalizedDocument | undefined>
		>();
}


class FakeDescriptorValidator {
	validate(
		value: unknown
	): ResourceDescriptor {
		return value as ResourceDescriptor;
	}
}

class FakeResourceLoader {
	loadDescriptor =
		vi.fn<
			(descriptor: ResourceDescriptor) => Promise<void>
		>(
			async () => {}
		);
}

describe(
	'NormalizedContentService',
	() => {
		it(
			'reads an already-accepted document locally without Resource loading',
			async () => {
				const store =
					new FakeStore();

				const loader =
					new FakeResourceLoader();

				const document =
					createDocument();

				store.get.mockResolvedValue(
					document
				);

				const service =
					new NormalizedContentService(
						store,
						loader,
						new FakeDescriptorValidator()
					);

				await expect(
					service.get(
						'publisher/kjvonly/normalized-content/documents/library/doc-1'
					)
				).resolves.toBe(
					document
				);

				expect(
					loader.loadDescriptor
				).not.toHaveBeenCalled();
			}
		);

		it(
			'returns an existing descriptor-backed document without loading its descriptor',
			async () => {
				const store =
					new FakeStore();

				const loader =
					new FakeResourceLoader();

				const document =
					createDocument();

				const descriptor =
					createDescriptor({
						dataVersion:
							2
					});

				store.get.mockResolvedValue(
					document
				);

				const service =
					new NormalizedContentService(
						store,
						loader,
						new FakeDescriptorValidator()
					);

				await expect(
					service.getByDescriptor(
						descriptor
					)
				).resolves.toBe(
					document
				);

				expect(
					store.get
				).toHaveBeenCalledWith(
					createNormalizedDocumentIdForDescriptor(
						descriptor
					)
				);

				expect(
					loader.loadDescriptor
				).not.toHaveBeenCalled();
			}
		);

		it(
			'loads a missing descriptor then re-reads accepted local persistence',
			async () => {
				const store =
					new FakeStore();

				const loader =
					new FakeResourceLoader();

				const document =
					createDocument();

				const descriptor =
					createDescriptor();

				store.get
					.mockResolvedValueOnce(
						undefined
					)
					.mockResolvedValueOnce(
						document
					);

				const service =
					new NormalizedContentService(
						store,
						loader,
						new FakeDescriptorValidator()
					);

				await expect(
					service.getByDescriptor(
						descriptor
					)
				).resolves.toBe(
					document
				);

				expect(
					loader.loadDescriptor
				).toHaveBeenCalledWith(
					descriptor
				);

				expect(
					store.get
				).toHaveBeenCalledTimes(
					2
				);
			}
		);

		it(
			'rejects an unsupported descriptor contract only when local accepted state is missing',
			async () => {
				const store =
					new FakeStore();

				const loader =
					new FakeResourceLoader();

				store.get.mockResolvedValue(
					undefined
				);

				const service =
					new NormalizedContentService(
						store,
						loader,
						new FakeDescriptorValidator()
					);

				await expect(
					service.getByDescriptor(
						createDescriptor({
							dataVersion:
								2
						})
					)
				).rejects.toThrow(
					'Unsupported normalized document data version: 2'
				);

				expect(
					loader.loadDescriptor
				).not.toHaveBeenCalled();
			}
		);

		it(
			'fails when descriptor processing does not install the expected document',
			async () => {
				const store =
					new FakeStore();

				const loader =
					new FakeResourceLoader();

				store.get.mockResolvedValue(
					undefined
				);

				const descriptor =
					createDescriptor();

				const service =
					new NormalizedContentService(
						store,
						loader,
						new FakeDescriptorValidator()
					);

				await expect(
					service.getByDescriptor(
						descriptor
					)
				).rejects.toThrow(
					'Normalized document was not installed:'
				);
			}
		);
	}
);

function createDocument():
	NormalizedDocument {
	return {
		blocks: []
	};
}

function createDescriptor(
	metadataOverrides:
		Partial<ResourceDescriptor['metadata']> =
		{}
): ResourceDescriptor {
	return {
		metadata: {
			publisher:
				'publisher',

			resourceId:
				'kjvonly/normalized-content/documents/library/doc-1',

			resourceType:
				NORMALIZED_CONTENT_RESOURCE_TYPE,

			dataType:
				NORMALIZED_DOCUMENT_DATA_TYPE,

			dataVersion:
				NORMALIZED_DOCUMENT_DATA_VERSION,

			modifiedAt:
				1,

			representation:
				'content',

			mediaType:
				'application/json',

			...metadataOverrides
		},

		strategy: {
			type:
				'test',

			data:
				null
		}
	};
}
