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

describe(
	'ResourceDescriptorWorkerPool',
	() => {
		it(
			'dispatches the first three requests immediately and queues the fourth',
			async () => {
				const firstWorker =
					new DeferredWorkerClient();

				const secondWorker =
					new DeferredWorkerClient();

				const thirdWorker =
					new DeferredWorkerClient();

				const pool =
					new ResourceDescriptorWorkerPool([
						firstWorker,
						secondWorker,
						thirdWorker
					]);

				const first =
					pool.process(
						createReference(
							'one'
						),
						createRepresentation(
							'one'
						)
					);

				const second =
					pool.process(
						createReference(
							'two'
						),
						createRepresentation(
							'two'
						)
					);

				const third =
					pool.process(
						createReference(
							'three'
						),
						createRepresentation(
							'three'
						)
					);

				const fourth =
					pool.process(
						createReference(
							'four'
						),
						createRepresentation(
							'four'
						)
					);

				expect(
					firstWorker.calls
				).toHaveLength(
					1
				);

				expect(
					secondWorker.calls
				).toHaveLength(
					1
				);

				expect(
					thirdWorker.calls
				).toHaveLength(
					1
				);

				expect(
					getRequestedResourceIds([
						firstWorker,
						secondWorker,
						thirdWorker
					])
				).toEqual([
					'kjvonly/resources/collections/one',
					'kjvonly/resources/collections/two',
					'kjvonly/resources/collections/three'
				]);

				secondWorker.resolveNext();

				await second;

				expect(
					secondWorker.calls
				).toHaveLength(
					2
				);

				expect(
					secondWorker.calls[1]
						?.requested
						.resourceId
				).toBe(
					'kjvonly/resources/collections/four'
				);

				firstWorker.resolveNext();
				thirdWorker.resolveNext();
				secondWorker.resolveNext();

				await Promise.all([
					first,
					second,
					third,
					fourth
				]);
			}
		);

		it(
			'dispatches queued requests in FIFO order',
			async () => {
				const firstWorker =
					new DeferredWorkerClient();

				const secondWorker =
					new DeferredWorkerClient();

				const thirdWorker =
					new DeferredWorkerClient();

				const pool =
					new ResourceDescriptorWorkerPool([
						firstWorker,
						secondWorker,
						thirdWorker
					]);

				const first =
					pool.process(
						createReference(
							'one'
						),
						createRepresentation(
							'one'
						)
					);

				const second =
					pool.process(
						createReference(
							'two'
						),
						createRepresentation(
							'two'
						)
					);

				const third =
					pool.process(
						createReference(
							'three'
						),
						createRepresentation(
							'three'
						)
					);

				const fourth =
					pool.process(
						createReference(
							'four'
						),
						createRepresentation(
							'four'
						)
					);

				const fifth =
					pool.process(
						createReference(
							'five'
						),
						createRepresentation(
							'five'
						)
					);

				thirdWorker.resolveNext();

				await third;

				expect(
					thirdWorker.calls[1]
						?.requested
						.resourceId
				).toBe(
					'kjvonly/resources/collections/four'
				);

				firstWorker.resolveNext();

				await first;

				expect(
					firstWorker.calls[1]
						?.requested
						.resourceId
				).toBe(
					'kjvonly/resources/collections/five'
				);

				secondWorker.resolveNext();
				thirdWorker.resolveNext();
				firstWorker.resolveNext();

				await Promise.all([
					first,
					second,
					third,
					fourth,
					fifth
				]);
			}
		);

		it(
			'frees a worker slot when processing fails',
			async () => {
				const firstWorker =
					new DeferredWorkerClient();

				const secondWorker =
					new DeferredWorkerClient();

				const thirdWorker =
					new DeferredWorkerClient();

				const pool =
					new ResourceDescriptorWorkerPool([
						firstWorker,
						secondWorker,
						thirdWorker
					]);

				const first =
					pool.process(
						createReference(
							'one'
						),
						createRepresentation(
							'one'
						)
					);

				const firstFailure =
					expect(
						first
					).rejects.toThrow(
						'Descriptor failed.'
					);

				const second =
					pool.process(
						createReference(
							'two'
						),
						createRepresentation(
							'two'
						)
					);

				const third =
					pool.process(
						createReference(
							'three'
						),
						createRepresentation(
							'three'
						)
					);

				const fourth =
					pool.process(
						createReference(
							'four'
						),
						createRepresentation(
							'four'
						)
					);

				firstWorker.rejectNext(
					new Error(
						'Descriptor failed.'
					)
				);

				await firstFailure;

				expect(
					firstWorker.calls
				).toHaveLength(
					2
				);

				expect(
					firstWorker.calls[1]
						?.requested
						.resourceId
				).toBe(
					'kjvonly/resources/collections/four'
				);

				secondWorker.resolveNext();
				thirdWorker.resolveNext();
				firstWorker.resolveNext();

				await Promise.all([
					second,
					third,
					fourth
				]);
			}
		);
	}
);

interface WorkerCall {
	readonly requested:
		PublishedResourceReference;

	readonly representation:
		ResourceRepresentation;
}

interface PendingWorkerCall {
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

class DeferredWorkerClient {

	readonly calls:
		WorkerCall[] =
			[];

	private readonly pending:
		PendingWorkerCall[] =
			[];

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

		const pending =
			this.takeNext();

		pending.resolve(
			createResult(
				pending.requested
			)
		);
	}

	rejectNext(
		error:
			unknown
	): void {

		this.takeNext()
			.reject(
				error
			);
	}

	private takeNext():
		PendingWorkerCall {

		const next =
			this.pending.shift();

		if (
			next ===
			undefined
		) {
			throw new Error(
				'No pending worker request.'
			);
		}

		return next;
	}
}

function createReference(
	name:
		string
): PublishedResourceReference {

	return {
		publisher:
			'publisher',

		resourceId:
			`kjvonly/resources/collections/${name}`
	};
}

function createRepresentation(
	name:
		string
): ResourceRepresentation {

	return {
		publisher:
			'publisher',

		resourceId:
			`kjvonly/resources/collections/${name}`,

		resourceType:
			'kjvonly/resources/collections',

		eventId:
			name.padEnd(
				64,
				'a'
			),

		modifiedAt:
			100,

		representation:
			'descriptors',

		mediaType:
			'application/json',

		payload:
			'[]'
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

function getRequestedResourceIds(
	workers:
		readonly DeferredWorkerClient[]
): string[] {

	return workers.flatMap(
		(worker) =>
			worker.calls.map(
				(call) =>
					call.requested.resourceId
			)
	);
}
