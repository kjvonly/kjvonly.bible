import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference,
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import {
	ResourceWorkerClient,
	type ResourceWorkerPort
} from './resource-worker-client';

import type {
	ResourceWorkerMainMessage,
	ResourceWorkerMessage
} from './resource-worker-message';

describe(
	'ResourceWorkerClient',
	() => {

		it(
			'sends install requests and resolves install results',
			async () => {
				const worker =
					new FakeWorker();

				const discovery =
					new FakeDiscovery(
						null
					);

				const client =
					new ResourceWorkerClient(
						worker,
						discovery
					);

				const reference =
					createReference();

				const promise =
					client.install(
						reference
					);

				expect(
					worker.messages
				).toHaveLength(
					1
				);

				const request =
					worker.messages[0];

				expect(
					request
				).toEqual({
					type:
						'install',

					requestId:
						'install-1',

					reference
				});

				if (
					request.type !==
					'install'
				) {
					throw new Error(
						'Expected install request.'
					);
				}

				worker.emit({
					type:
						'install-result',

					requestId:
						request.requestId,

					result: {
						requested:
							reference,

						found:
							true,

						resources: [
							{
								reference,

								resourceType:
									'kjvonly/bible/chapters',

								status:
									'handled'
							}
						]
					}
				});

				await expect(
					promise
				).resolves.toEqual({
					requested:
						reference,

					found:
						true,

					resources: [
						{
							reference,

							resourceType:
								'kjvonly/bible/chapters',

							status:
								'handled'
						}
					]
				});
			}
		);

		it(
			'bridges discovery requests to ResourceDiscovery',
			async () => {
				const worker =
					new FakeWorker();

				const representation =
					createRepresentation();

				const discovery =
					new FakeDiscovery(
						representation
					);

				new ResourceWorkerClient(
					worker,
					discovery
				);

				const reference =
					createReference();

				worker.emit({
					type:
						'discovery',

					requestId:
						'discovery-1',

					reference
				});

				await flushAsync();

				expect(
					discovery.references
				).toEqual([
					reference
				]);

				expect(
					worker.messages
				).toEqual([
					{
						type:
							'discovery-result',

						requestId:
							'discovery-1',

						representation
					}
				]);
			}
		);

		it(
			'preserves normal Resource absence across the discovery bridge',
			async () => {
				const worker =
					new FakeWorker();

				const discovery =
					new FakeDiscovery(
						null
					);

				new ResourceWorkerClient(
					worker,
					discovery
				);

				worker.emit({
					type:
						'discovery',

					requestId:
						'discovery-1',

					reference:
						createReference()
				});

				await flushAsync();

				expect(
					worker.messages
				).toEqual([
					{
						type:
							'discovery-result',

						requestId:
							'discovery-1',

						representation:
							null
					}
				]);
			}
		);

		it(
			'returns discovery failures as serializable worker errors',
			async () => {
				const worker =
					new FakeWorker();

				const discovery =
					new FakeDiscovery(
						null,
						new Error(
							'Relay unavailable.'
						)
					);

				new ResourceWorkerClient(
					worker,
					discovery
				);

				worker.emit({
					type:
						'discovery',

					requestId:
						'discovery-1',

					reference:
						createReference()
				});

				await flushAsync();

				expect(
					worker.messages
				).toHaveLength(
					1
				);

				expect(
					worker.messages[0]
				).toMatchObject({
					type:
						'discovery-error',

					requestId:
						'discovery-1',

					error: {
						name:
							'Error',

						message:
							'Relay unavailable.'
					}
				});
			}
		);

		it(
			'rejects install failures returned by the worker',
			async () => {
				const worker =
					new FakeWorker();

				const client =
					new ResourceWorkerClient(
						worker,
						new FakeDiscovery(
							null
						)
					);

				const promise =
					client.install(
						createReference()
					);

				const request =
					worker.messages[0];

				if (
					request.type !==
					'install'
				) {
					throw new Error(
						'Expected install request.'
					);
				}

				worker.emit({
					type:
						'install-error',

					requestId:
						request.requestId,

					error: {
						name:
							'Error',

						message:
							'Worker installation failed.'
					}
				});

				await expect(
					promise
				).rejects.toThrow(
					'Worker installation failed.'
				);
			}
		);

		it(
			'rehydrates failed Resource outcomes as Error instances',
			async () => {
				const worker =
					new FakeWorker();

				const client =
					new ResourceWorkerClient(
						worker,
						new FakeDiscovery(
							null
						)
					);

				const reference =
					createReference();

				const promise =
					client.install(
						reference
					);

				const request =
					worker.messages[0];

				if (
					request.type !==
					'install'
				) {
					throw new Error(
						'Expected install request.'
					);
				}

				worker.emit({
					type:
						'install-result',

					requestId:
						request.requestId,

					result: {
						requested:
							reference,

						found:
							true,

						resources: [
							{
								reference,

								resourceType:
									'kjvonly/bible/chapters',

								status:
									'failed',

								error: {
									name:
										'Error',

									message:
										'Invalid Chapter.'
								}
							}
						]
					}
				});

				const result =
					await promise;

				const outcome =
					result.resources[0];

				expect(
					outcome.status
				).toBe(
					'failed'
				);

				if (
					outcome.status !==
					'failed'
				) {
					throw new Error(
						'Expected failed outcome.'
					);
				}

				expect(
					outcome.error
				).toBeInstanceOf(
					Error
				);

				expect(
					(
						outcome.error as Error
					).message
				).toBe(
					'Invalid Chapter.'
				);
			}
		);

		it(
			'matches concurrent install results by request id',
			async () => {
				const worker =
					new FakeWorker();

				const client =
					new ResourceWorkerClient(
						worker,
						new FakeDiscovery(
							null
						)
					);

				const firstReference = {
					publisher:
						'a'.repeat(
							64
						),

					resourceId:
						'kjvonly/bible/chapters/kjvs'
				};

				const secondReference = {
					publisher:
						'b'.repeat(
							64
						),

					resourceId:
						'kjvonly/strongs/definitions/kjvs'
				};

				const first =
					client.install(
						firstReference
					);

				const second =
					client.install(
						secondReference
					);

				worker.emit({
					type:
						'install-result',

					requestId:
						'install-2',

					result: {
						requested:
							secondReference,

						found:
							false,

						resources:
							[]
					}
				});

				worker.emit({
					type:
						'install-result',

					requestId:
						'install-1',

					result: {
						requested:
							firstReference,

						found:
							false,

						resources:
							[]
					}
				});

				await expect(
					first
				).resolves.toMatchObject({
					requested:
						firstReference
				});

				await expect(
					second
				).resolves.toMatchObject({
					requested:
						secondReference
				});
			}
		);

		it(
			'terminates the worker and rejects pending installs when disposed',
			async () => {
				const worker =
					new FakeWorker();

				const client =
					new ResourceWorkerClient(
						worker,
						new FakeDiscovery(
							null
						)
					);

				const promise =
					client.install(
						createReference()
					);

				client.dispose();

				expect(
					worker.terminated
				).toBe(
					true
				);

				await expect(
					promise
				).rejects.toThrow(
					'Resource worker client was disposed.'
				);
			}
		);
	}
);

function createReference():
	PublishedResourceReference {

	return {
		publisher:
			'a'.repeat(
				64
			),

		resourceId:
			'kjvonly/resources/collections/default'
	};
}

function createRepresentation():
	ResourceRepresentation {

	return {
		publisher:
			'a'.repeat(
				64
			),

		resourceId:
			'kjvonly/resources/collections/default',

		resourceType:
			'kjvonly/resources/collections',

		eventId:
			'b'.repeat(
				64
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

async function flushAsync():
	Promise<void> {

	await Promise.resolve();
	await Promise.resolve();
}

class FakeDiscovery {

	readonly references:
		PublishedResourceReference[] =
			[];

	constructor(
		private readonly representation:
			ResourceRepresentation |
			null,

		private readonly error?:
			Error
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

		if (
			this.error !==
			undefined
		) {
			throw this.error;
		}

		return this.representation;
	}
}

class FakeWorker
	implements ResourceWorkerPort {

	readonly messages:
		ResourceWorkerMainMessage[] =
			[];

	terminated =
		false;

	private readonly listeners =
		new Set<
			(
				event:
					MessageEvent<
						ResourceWorkerMessage
					>
			) => void
		>();

	postMessage(
		message:
			ResourceWorkerMainMessage
	): void {

		this.messages.push(
			message
		);
	}

	addEventListener(
		_type:
			'message',

		listener:
			(
				event:
					MessageEvent<
						ResourceWorkerMessage
					>
			) => void
	): void {

		this.listeners.add(
			listener
		);
	}

	removeEventListener(
		_type:
			'message',

		listener:
			(
				event:
					MessageEvent<
						ResourceWorkerMessage
					>
			) => void
	): void {

		this.listeners.delete(
			listener
		);
	}

	terminate():
		void {

		this.terminated =
			true;
	}

	emit(
		message:
			ResourceWorkerMessage
	): void {

		const event = {
			data:
				message
		} as MessageEvent<
			ResourceWorkerMessage
		>;

		for (
			const listener
			of this.listeners
		) {
			listener(
				event
			);
		}
	}
}