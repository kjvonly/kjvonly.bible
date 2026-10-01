import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	ResourceInstallResult
} from '$lib/resource/services/resource-install-result';

import {
	ResourceLoader
} from './resource-loader';

import {
	appendResourceReferenceBuilder
} from './resource-reference-builder';

describe(
	'ResourceLoader',
	() => {
		it(
			'loads the individual Resource first',
			async () => {
				const resources =
					new FakeResourceService([
						handled(
							individualReference()
						)
					]);

				const loader =
					createLoader(
						resources
					);

				const result =
					await loader.load(
						sourceReference(),
						'G1'
					);

				expect(
					result
				).toBe(
					true
				);

				expect(
					resources.references
				).toEqual([
					individualReference()
				]);
			}
		);

		it(
			'falls back to the bundle when the individual Resource is absent',
			async () => {
				const resources =
					new FakeResourceService([
						missing(
							individualReference()
						),

						handled(
							sourceReference()
						)
					]);

				const loader =
					createLoader(
						resources
					);

				const result =
					await loader.load(
						sourceReference(),
						'G1'
					);

				expect(
					result
				).toBe(
					true
				);

				expect(
					resources.references
				).toEqual([
					individualReference(),
					sourceReference()
				]);
			}
		);

		it(
			'returns false when the individual and bundle Resources are absent',
			async () => {
				const resources =
					new FakeResourceService([
						missing(
							individualReference()
						),

						missing(
							sourceReference()
						)
					]);

				const loader =
					createLoader(
						resources
					);

				const result =
					await loader.load(
						sourceReference(),
						'G1'
					);

				expect(
					result
				).toBe(
					false
				);
			}
		);

		it(
			'accepts a current individual Resource as successfully loaded',
			async () => {
				const resources =
					new FakeResourceService([
						current(
							individualReference()
						)
					]);

				const result =
					await createLoader(
						resources
					).load(
						sourceReference(),
						'G1'
					);

				expect(
					result
				).toBe(
					true
				);

				expect(
					resources.references
				).toEqual([
					individualReference()
				]);
			}
		);

		it(
			'does not fall back when the individual Resource fails',
			async () => {
				const failure =
					new Error(
						'Processing failed'
					);

				const resources =
					new FakeResourceService([
						failed(
							individualReference(),
							failure
						)
					]);

				const loader =
					createLoader(
						resources
					);

				await expect(
					loader.load(
						sourceReference(),
						'G1'
					)
				).rejects.toBe(
					failure
				);

				expect(
					resources.references
				).toEqual([
					individualReference()
				]);
			}
		);

		it(
			'does not fall back when the individual Resource is unsupported',
			async () => {
				const resources =
					new FakeResourceService([
						unsupported(
							individualReference()
						)
					]);

				const loader =
					createLoader(
						resources
					);

				await expect(
					loader.load(
						sourceReference(),
						'G1'
					)
				).rejects.toThrow(
					'Unsupported Resource Type: kjvonly/strongs/definitions'
				);

				expect(
					resources.references
				).toEqual([
					individualReference()
				]);
			}
		);

		it(
			'propagates bundle processing failure',
			async () => {
				const failure =
					new Error(
						'Bundle failed'
					);

				const resources =
					new FakeResourceService([
						missing(
							individualReference()
						),

						failed(
							sourceReference(),
							failure
						)
					]);

				const loader =
					createLoader(
						resources
					);

				await expect(
					loader.load(
						sourceReference(),
						'G1'
					)
				).rejects.toBe(
					failure
				);
			}
		);

		it(
			'loads an already-known Resource descriptor without discovery',
			async () => {
				const descriptor =
					resourceDescriptor();

				const resources =
					new FakeResourceService(
						[],
						[
							handled(
								descriptorReference()
							)
						]
					);

				const loader =
					createLoader(
						resources
					);

				await loader.loadDescriptor(
					descriptor
				);

				expect(
					resources.descriptors
				).toEqual([
					descriptor
				]);

				expect(
					resources.references
				).toEqual([]);
			}
		);

		it(
			'accepts a current descriptor Resource as successfully loaded',
			async () => {
				const resources =
					new FakeResourceService(
						[],
						[
							current(
								descriptorReference()
							)
						]
					);

				await expect(
					createLoader(
						resources
					).loadDescriptor(
						resourceDescriptor()
					)
				).resolves.toBeUndefined();
			}
		);

		it(
			'propagates descriptor processing failures',
			async () => {
				const failure =
					new Error(
						'Descriptor failed'
					);

				const resources =
					new FakeResourceService(
						[],
						[
							failed(
								descriptorReference(),
								failure
							)
						]
					);

				await expect(
					createLoader(
						resources
					).loadDescriptor(
						resourceDescriptor()
					)
				).rejects.toBe(
					failure
				);
			}
		);

		it(
			'supports Resource Types without individual Resources',
			async () => {
				const resources =
					new FakeResourceService([
						handled(
							sourceReference()
						)
					]);

				const loader =
					new ResourceLoader(
						resources,
						{
							individual:
								() =>
									null,

							bundle:
								(source) =>
									source
						}
					);

				const result =
					await loader.load(
						sourceReference(),
						'G1'
					);

				expect(
					result
				).toBe(
					true
				);

				expect(
					resources.references
				).toEqual([
					sourceReference()
				]);
			}
		);
	}
);

function createLoader(
	resources:
		FakeResourceService
): ResourceLoader<string> {
	return new ResourceLoader(
		resources,
		appendResourceReferenceBuilder
	);
}

function sourceReference():
	PublishedResourceReference {
	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/strongs/definitions/kjvs'
	};
}

function individualReference():
	PublishedResourceReference {
	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/strongs/definitions/kjvs/G1'
	};
}

function descriptorReference():
	PublishedResourceReference {
	return {
		publisher:
			'descriptor-publisher',

		resourceId:
			'descriptor-resource'
	};
}

function resourceDescriptor():
	ResourceDescriptor {
	return {
		metadata: {
			publisher:
				descriptorReference().publisher,

			resourceId:
				descriptorReference().resourceId,

			category:
				'kjvonly/notes',

			modifiedAt:
				123,

			representation:
				'content',

			mediaType:
				'application/json'
		},

		strategy: {
			type:
				'example',

			data:
				{}
		}
	};
}

function missing(
	reference:
		PublishedResourceReference
): ResourceInstallResult {
	return {
		requested:
			reference,

		found:
			false,

		resources:
			[]
	};
}

function handled(
	reference:
		PublishedResourceReference
): ResourceInstallResult {
	return {
		requested:
			reference,

		found:
			true,

		resources: [
			{
				reference,
				resourceType:
					'kjvonly/strongs/definitions',
				status:
					'handled'
			}
		]
	};
}

function current(
	reference:
		PublishedResourceReference
): ResourceInstallResult {
	return {
		requested:
			reference,

		found:
			true,

		resources: [
			{
				reference,
				resourceType:
					'kjvonly/notes',
				status:
					'current'
			}
		]
	};
}

function failed(
	reference:
		PublishedResourceReference,
	error:
		unknown
): ResourceInstallResult {
	return {
		requested:
			reference,

		found:
			true,

		resources: [
			{
				reference,
				resourceType:
					'kjvonly/strongs/definitions',
				status:
					'failed',
				error
			}
		]
	};
}

function unsupported(
	reference:
		PublishedResourceReference
): ResourceInstallResult {
	return {
		requested:
			reference,

		found:
			true,

		resources: [
			{
				reference,
				resourceType:
					'kjvonly/strongs/definitions',
				status:
					'unsupported'
			}
		]
	};
}

class FakeResourceService {

	readonly references:
		PublishedResourceReference[] =
			[];

	readonly descriptors:
		ResourceDescriptor[] =
			[];

	constructor(
		private readonly results:
			readonly ResourceInstallResult[],

		private readonly descriptorResults:
			readonly ResourceInstallResult[] =
				[]
	) {}

	async install(
		reference:
			PublishedResourceReference
	): Promise<ResourceInstallResult> {
		this.references.push(
			reference
		);

		const result =
			this.results[
				this.references.length -
				1
			];

		if (
			result === undefined
		) {
			throw new Error(
				'Unexpected Resource install.'
			);
		}

		return result;
	}

	async installDescriptor(
		descriptor:
			ResourceDescriptor
	): Promise<ResourceInstallResult> {
		this.descriptors.push(
			descriptor
		);

		const result =
			this.descriptorResults[
				this.descriptors.length -
				1
			];

		if (
			result === undefined
		) {
			throw new Error(
				'Unexpected Resource descriptor install.'
			);
		}

		return result;
	}

}