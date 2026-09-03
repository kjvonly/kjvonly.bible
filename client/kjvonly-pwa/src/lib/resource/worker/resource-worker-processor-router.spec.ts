import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference,
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import type {
	ResourceInstallResult
} from '$lib/resource/services/resource-install-result';

import {
	ResourceDescriptorWorkerPool
} from './resource-descriptor-worker-pool';

import {
	ResourceWorkerProcessorRouter
} from './resource-worker-processor-router';

describe(
	'ResourceWorkerProcessorRouter',
	() => {
		it(
			'routes content Resources only to the content processor',
			async () => {
				const content =
					new ImmediateProcessor();

				const descriptors =
					new ImmediateProcessor();

				const router =
					new ResourceWorkerProcessorRouter(
						content,
						descriptors
					);

				const requested =
					createReference(
						'kjvonly/bible/chapters/kjvs/1_1'
					);

				const representation =
					createRepresentation(
						requested,
						'content'
					);

				await router.process(
					requested,
					representation
				);

				expect(
					content.calls
				).toEqual([
					{
						requested,
						representation
					}
				]);

				expect(
					descriptors.calls
				).toHaveLength(
					0
				);
			}
		);

		it(
			'routes descriptor Resources only to the descriptor processor',
			async () => {
				const content =
					new ImmediateProcessor();

				const descriptors =
					new ImmediateProcessor();

				const router =
					new ResourceWorkerProcessorRouter(
						content,
						descriptors
					);

				const requested =
					createReference(
						'kjvonly/resources/collections/default'
					);

				const representation =
					createRepresentation(
						requested,
						'descriptors'
					);

				await router.process(
					requested,
					representation
				);

				expect(
					content.calls
				).toHaveLength(
					0
				);

				expect(
					descriptors.calls
				).toEqual([
					{
						requested,
						representation
					}
				]);
			}
		);

		it(
			'starts content processing while all descriptor workers are busy and another descriptor is queued',
			async () => {
				const firstDescriptor =
					new DeferredProcessor();

				const secondDescriptor =
					new DeferredProcessor();

				const thirdDescriptor =
					new DeferredProcessor();

				const descriptorPool =
					new ResourceDescriptorWorkerPool([
						firstDescriptor,
						secondDescriptor,
						thirdDescriptor
					]);

				const content =
					new ImmediateProcessor();

				const router =
					new ResourceWorkerProcessorRouter(
						content,
						descriptorPool
					);

				const descriptorRequests =
					[
						'one',
						'two',
						'three',
						'four'
					].map(
						(name) => {
							const requested =
								createReference(
									`kjvonly/resources/collections/${name}`
								);

							return router.process(
								requested,
								createRepresentation(
									requested,
									'descriptors'
								)
							);
						}
					);

				expect(
					firstDescriptor.calls
				).toHaveLength(
					1
				);

				expect(
					secondDescriptor.calls
				).toHaveLength(
					1
				);

				expect(
					thirdDescriptor.calls
				).toHaveLength(
					1
				);

				const contentReference =
					createReference(
						'kjvonly/bible/chapters/kjvs/1_1'
					);

				const contentResult =
					await router.process(
						contentReference,
						createRepresentation(
							contentReference,
							'content'
						)
					);

				expect(
					content.calls
				).toHaveLength(
					1
				);

				expect(
					contentResult.requested
				).toEqual(
					contentReference
				);

				expect(
					firstDescriptor.pendingCount
				).toBe(
					1
				);

				expect(
					secondDescriptor.pendingCount
				).toBe(
					1
				);

				expect(
					thirdDescriptor.pendingCount
				).toBe(
					1
				);

				firstDescriptor.resolveNext();

				await descriptorRequests[0];

				firstDescriptor.resolveNext();

				secondDescriptor.resolveNext();
				thirdDescriptor.resolveNext();

				await Promise.all(
					descriptorRequests
				);
			}
		);

		it(
			'keeps descriptor processing available after content processing fails',
			async () => {
				const content =
					new FailingProcessor(
						new Error(
							'Content failed.'
						)
					);

				const descriptors =
					new ImmediateProcessor();

				const router =
					new ResourceWorkerProcessorRouter(
						content,
						descriptors
					);

				const contentReference =
					createReference(
						'kjvonly/bible/chapters/kjvs/1_1'
					);

				await expect(
					router.process(
						contentReference,
						createRepresentation(
							contentReference,
							'content'
						)
					)
				).rejects.toThrow(
					'Content failed.'
				);

				const descriptorReference =
					createReference(
						'kjvonly/resources/collections/default'
					);

				await expect(
					router.process(
						descriptorReference,
						createRepresentation(
							descriptorReference,
							'descriptors'
						)
					)
				).resolves.toMatchObject({
					requested:
						descriptorReference
				});
			}
		);

		it(
			'keeps content processing available after descriptor processing fails',
			async () => {
				const content =
					new ImmediateProcessor();

				const descriptors =
					new FailingProcessor(
						new Error(
							'Descriptor failed.'
						)
					);

				const router =
					new ResourceWorkerProcessorRouter(
						content,
						descriptors
					);

				const descriptorReference =
					createReference(
						'kjvonly/resources/collections/default'
					);

				await expect(
					router.process(
						descriptorReference,
						createRepresentation(
							descriptorReference,
							'descriptors'
						)
					)
				).rejects.toThrow(
					'Descriptor failed.'
				);

				const contentReference =
					createReference(
						'kjvonly/bible/chapters/kjvs/1_1'
					);

				await expect(
					router.process(
						contentReference,
						createRepresentation(
							contentReference,
							'content'
						)
					)
				).resolves.toMatchObject({
					requested:
						contentReference
				});
			}
		);
	}
);

interface ProcessorCall {
	readonly requested:
		PublishedResourceReference;

	readonly representation:
		ResourceRepresentation;
}

class ImmediateProcessor {

	readonly calls:
		ProcessorCall[] =
			[];

	async process(
		requested:
			PublishedResourceReference,

		representation:
			ResourceRepresentation
	): Promise<ResourceInstallResult> {

		this.calls.push({
			requested,
			representation
		});

		return createResult(
			requested
		);
	}
}

class FailingProcessor {

	constructor(
		private readonly error:
			Error
	) {}

	async process(
		_requested:
			PublishedResourceReference,

		_representation:
			ResourceRepresentation
	): Promise<ResourceInstallResult> {

		throw this.error;
	}
}

interface PendingProcessorCall {
	readonly requested:
		PublishedResourceReference;

	readonly resolve:
		(
			result:
				ResourceInstallResult
		) => void;

	readonly reject:
		(
			error:
				unknown
		) => void;
}

class DeferredProcessor {

	readonly calls:
		ProcessorCall[] =
			[];

	private readonly pending:
		PendingProcessorCall[] =
			[];

	get pendingCount():
		number {

		return this.pending.length;
	}

	process(
		requested:
			PublishedResourceReference,

		representation:
			ResourceRepresentation
	): Promise<ResourceInstallResult> {

		this.calls.push({
			requested,
			representation
		});

		return new Promise(
			(
				resolve,
				reject
			) => {

				this.pending.push({
					requested,
					resolve,
					reject
				});
			}
		);
	}

	resolveNext(): void {

		const next =
			this.pending.shift();

		if (
			next ===
			undefined
		) {
			throw new Error(
				'No pending processor request.'
			);
		}

		next.resolve(
			createResult(
				next.requested
			)
		);
	}
}

function createReference(
	resourceId:
		string
): PublishedResourceReference {

	return {
		publisher:
			'publisher',

		resourceId
	};
}

function createRepresentation(
	reference:
		PublishedResourceReference,

	representation:
		'content' |
		'descriptors'
): ResourceRepresentation {

	return {
		publisher:
			reference.publisher,

		resourceId:
			reference.resourceId,

		resourceType:
			reference.resourceId
				.split('/')
				.slice(
					0,
					3
				)
				.join('/'),

		eventId:
			'a'.repeat(
				64
			),

		modifiedAt:
			100,

		representation,

		mediaType:
			'application/json',

		payload:
			representation ===
				'content'
				? '{}'
				: '[]'
	};
}

function createResult(
	requested:
		PublishedResourceReference
): ResourceInstallResult {

	return {
		requested,
		found:
			true,
		resources:
			[]
	};
}
