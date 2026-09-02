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
	ResourceDiscovery
} from '$lib/resource/nostr/resource-discovery';

import type {
	ResourceInstallResult
} from './resource-install-result';

import {
	ResourceService
} from './resource.service';

describe(
	'ResourceService',
	() => {
		it(
			'returns not found when the requested Resource does not exist',
			async () => {
				const processor =
					new FakeProcessor();

				const service =
					createService({
						representation:
							null,

						processor
					});

				const result =
					await service.install(
						createReference()
					);

				expect(
					result
				).toEqual({
					requested:
						createReference(),

					found:
						false,

					resources:
						[]
				});

				expect(
					processor.calls
				).toHaveLength(
					0
				);
			}
		);

		it(
			'passes the discovered Resource representation to the processor',
			async () => {
				const reference =
					createReference();

				const representation =
					createRepresentation();

				const processor =
					new FakeProcessor();

				const service =
					createService({
						representation,
						processor
					});

				await service.install(
					reference
				);

				expect(
					processor.calls
				).toEqual([
					{
						requested:
							reference,

						representation
					}
				]);
			}
		);

		it(
			'deduplicates concurrent installs for the same Published Resource',
			async () => {
				const discovery =
					new DeferredDiscovery();

				const processor =
					new FakeProcessor();

				const service =
					createService({
						discovery,
						processor
					});

				const firstReference =
					createReference();

				const secondReference =
					createReference();

				const first =
					service.install(
						firstReference
					);

				const second =
					service.install(
						secondReference
					);

				expect(
					first
				).toBe(
					second
				);

				expect(
					discovery.references
				).toEqual([
					firstReference
				]);

				discovery.resolve(
					firstReference,
					createRepresentation()
				);

				await Promise.all([
					first,
					second
				]);

				expect(
					discovery.references
				).toHaveLength(
					1
				);

				expect(
					processor.calls
				).toHaveLength(
					1
				);
			}
		);

		it(
			'shares the successful result of a concurrent install',
			async () => {
				const discovery =
					new DeferredDiscovery();

				const result =
					createInstallResult();

				const processor =
					new FakeProcessor(
						result
					);

				const service =
					createService({
						discovery,
						processor
					});

				const reference =
					createReference();

				const first =
					service.install(
						reference
					);

				const second =
					service.install({
						...reference
					});

				expect(
					first
				).toBe(
					second
				);

				discovery.resolve(
					reference,
					createRepresentation()
				);

				const firstResult =
					await first;

				const secondResult =
					await second;

				expect(
					firstResult
				).toBe(
					result
				);

				expect(
					secondResult
				).toBe(
					firstResult
				);

				expect(
					processor.calls
				).toHaveLength(
					1
				);
			}
		);

		it(
			'shares a failed Resource result between concurrent callers',
			async () => {
				const failure =
					new Error(
						'Strong\'s failed'
					);

				const discovery =
					new DeferredDiscovery();

				const result =
					createInstallResult({
						resources: [
							{
								reference: {
									publisher:
										'publisher',

									resourceId:
										'kjvonly/strongs/definitions/kjvs'
								},

								resourceType:
									'kjvonly/strongs/definitions',

								status:
									'failed',

								error:
									failure
							}
						]
					});

				const processor =
					new FakeProcessor(
						result
					);

				const service =
					createService({
						discovery,
						processor
					});

				const reference =
					createReference();

				const first =
					service.install(
						reference
					);

				const second =
					service.install({
						...reference
					});

				expect(
					first
				).toBe(
					second
				);

				discovery.resolve(
					reference,
					createRepresentation()
				);

				const firstResult =
					await first;

				const secondResult =
					await second;

				expect(
					firstResult
				).toBe(
					result
				);

				expect(
					secondResult
				).toBe(
					firstResult
				);

				expect(
					processor.calls
				).toHaveLength(
					1
				);
			}
		);

		it(
			'clears a rejected in-flight install so a later request can try again',
			async () => {
				const discovery =
					new DeferredDiscovery();

				const processor =
					new FakeProcessor();

				const service =
					createService({
						discovery,
						processor
					});

				const reference =
					createReference();

				const failure =
					new Error(
						'Discovery failed.'
					);

				const first =
					service.install(
						reference
					);

				const concurrent =
					service.install({
						...reference
					});

				expect(
					concurrent
				).toBe(
					first
				);

				const firstRejection =
					expect(
						first
					).rejects.toBe(
						failure
					);

				const concurrentRejection =
					expect(
						concurrent
					).rejects.toBe(
						failure
					);

				discovery.reject(
					reference,
					failure
				);

				await firstRejection;
				await concurrentRejection;

				const retry =
					service.install(
						reference
					);

				expect(
					retry
				).not.toBe(
					first
				);

				expect(
					discovery.references
				).toEqual([
					reference,
					reference
				]);

				discovery.resolve(
					reference,
					createRepresentation()
				);

				await expect(
					retry
				).resolves.toMatchObject({
					requested:
						reference,

					found:
						true
				});

				expect(
					processor.calls
				).toHaveLength(
					1
				);
			}
		);

		it(
			'does not deduplicate different Published Resources',
			async () => {
				const discovery =
					new DeferredDiscovery();

				const processor =
					new FakeProcessor();

				const service =
					createService({
						discovery,
						processor
					});

				const firstReference =
					createReference();

				const secondReference:
					PublishedResourceReference = {
					publisher:
						firstReference.publisher,

					resourceId:
						'kjvonly/strongs/definitions/kjvs/H7225'
				};

				const first =
					service.install(
						firstReference
					);

				const second =
					service.install(
						secondReference
					);

				expect(
					first
				).not.toBe(
					second
				);

				expect(
					discovery.references
				).toEqual([
					firstReference,
					secondReference
				]);

				let firstSettled =
					false;

				void first.then(
					() => {
						firstSettled =
							true;
					},

					() => {
						firstSettled =
							true;
					}
				);

				discovery.resolve(
					secondReference,
					createRepresentation({
						resourceId:
							secondReference.resourceId
					})
				);

				await expect(
					second
				).resolves.toMatchObject({
					requested:
						secondReference,

					found:
						true
				});

				expect(
					firstSettled
				).toBe(
					false
				);

				discovery.resolve(
					firstReference,
					createRepresentation()
				);

				await expect(
					first
				).resolves.toMatchObject({
					requested:
						firstReference,

					found:
						true
				});

				expect(
					processor.calls
				).toHaveLength(
					2
				);
			}
		);
	}
);

function createService(
	options: {
		readonly representation?:
			ResourceRepresentation |
			null;

		readonly discovery?:
			Pick<
				ResourceDiscovery,
				'get'
			>;

		readonly processor?:
			FakeProcessor;
	} = {}
): ResourceService {

	return new ResourceService(
		options.discovery ??
			new FakeDiscovery(
				options.representation ===
					undefined
					? createRepresentation()
					: options.representation
			),

		options.processor ??
			new FakeProcessor()
	);
}

function createReference():
	PublishedResourceReference {

	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/strongs/definitions/kjvs'
	};
}

function createRepresentation(
	overrides:
		Partial<ResourceRepresentation> =
			{}
):
	ResourceRepresentation {

	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/strongs/definitions/kjvs',

		resourceType:
			'kjvonly/strongs/definitions',

		eventId:
			'a'.repeat(
				64
			),

		modifiedAt:
			100,

		representation:
			'content',

		mediaType:
			'application/json',

		payload:
			'{}',

		...overrides
	};
}

function createInstallResult(
	overrides:
		Partial<ResourceInstallResult> =
			{}
): ResourceInstallResult {

	return {
		requested:
			createReference(),

		found:
			true,

		resources:
			[],

		...overrides
	};
}

class FakeDiscovery {

	readonly references:
		PublishedResourceReference[] =
			[];

	constructor(
		private readonly representation:
			ResourceRepresentation |
			null
	) {}

	async get(
		reference:
			PublishedResourceReference
	): Promise<
		ResourceRepresentation |
		null
	> {

		this.references.push(
			reference
		);

		return this.representation;
	}
}

interface PendingDiscovery {
	readonly resolve:
		(
			representation:
				ResourceRepresentation |
				null
		) => void;

	readonly reject:
		(
			error:
				unknown
		) => void;
}

class DeferredDiscovery {

	readonly references:
		PublishedResourceReference[] =
			[];

	private readonly pending =
		new Map<
			string,
			PendingDiscovery[]
		>();

	get(
		reference:
			PublishedResourceReference
	): Promise<
		ResourceRepresentation |
		null
	> {

		this.references.push(
			reference
		);

		return new Promise(
			(
				resolve,
				reject
			) => {

				const key =
					this.createKey(
						reference
					);

				const pending =
					this.pending.get(
						key
					) ??
						[];

				pending.push({
					resolve,
					reject
				});

				this.pending.set(
					key,
					pending
				);
			}
		);
	}

	resolve(
		reference:
			PublishedResourceReference,

		representation:
			ResourceRepresentation |
			null
	): void {

		this.take(
			reference
		).resolve(
			representation
		);
	}

	reject(
		reference:
			PublishedResourceReference,

		error:
			unknown
	): void {

		this.take(
			reference
		).reject(
			error
		);
	}

	private take(
		reference:
			PublishedResourceReference
	): PendingDiscovery {

		const key =
			this.createKey(
				reference
			);

		const pending =
			this.pending.get(
				key
			);

		if (
			pending ===
			undefined ||
			pending.length ===
			0
		) {
			throw new Error(
				'No pending discovery request.'
			);
		}

		const next =
			pending.shift();

		if (
			pending.length ===
			0
		) {
			this.pending.delete(
				key
			);
		}

		if (
			next ===
			undefined
		) {
			throw new Error(
				'No pending discovery request.'
			);
		}

		return next;
	}

	private createKey(
		reference:
			PublishedResourceReference
	): string {

		return JSON.stringify([
			reference.publisher,
			reference.resourceId
		]);
	}
}

interface FakeProcessorCall {
	readonly requested:
		PublishedResourceReference;

	readonly representation:
		ResourceRepresentation;
}

class FakeProcessor {

	readonly calls:
		FakeProcessorCall[] =
			[];

	constructor(
		private readonly result?:
			ResourceInstallResult
	) {}

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

		return this.result ??
			{
				requested,
				found:
					true,
				resources:
					[]
			};
	}
}
