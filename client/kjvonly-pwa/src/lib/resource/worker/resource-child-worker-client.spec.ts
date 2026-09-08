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
	ResourceChildWorkerClient
} from './resource-child-worker-client';

import type {
	ResourceChildWorkerMessage,
	ResourceChildWorkerRequest
} from './resource-child-worker-message';

describe(
	'ResourceChildWorkerClient',
	() => {
		it(
			'sends process requests and resolves process results',
			async () => {
				const worker =
					new FakeWorker();

				const client =
					createClient(
						worker
					);

				const requested =
					createReference();

				const representation =
					createRepresentation(
						requested
					);

				const promise =
					client.process(
						requested,
						representation
					);

				expect(
					worker.messages
				).toEqual([
					{
						type:
							'process',

						requestId:
							'1',

						requested,

						representation
					}
				]);

				worker.emitMessage({
					type:
						'process-result',

					requestId:
						'1',

					result: {
						requested,
						found:
							true,
						resources:
							[]
					}
				});

				await expect(
					promise
				).resolves.toEqual({
					requested,
					found:
						true,
					resources:
						[]
				});
			}
		);

		it(
			'rejects serialized process errors',
			async () => {
				const worker =
					new FakeWorker();

				const client =
					createClient(
						worker
					);

				const promise =
					client.process(
						createReference(),
						createRepresentation(
							createReference()
						)
					);

				const rejection =
					expect(
						promise
					).rejects.toThrow(
						'Descriptor failed.'
					);

				worker.emitMessage({
					type:
						'process-error',

					requestId:
						'1',

					error: {
						name:
							'Error',

						message:
							'Descriptor failed.'
					}
				});

				await rejection;
			}
		);

		it(
			'matches concurrent process results by request id',
			async () => {
				const worker =
					new FakeWorker();

				const client =
					createClient(
						worker
					);

				const firstReference =
					createReference(
						'kjvonly/bible/chapters/kjvs/1_1'
					);

				const secondReference =
					createReference(
						'kjvonly/strongs/definitions/kjvs/G1'
					);

				const first =
					client.process(
						firstReference,
						createRepresentation(
							firstReference
						)
					);

				const second =
					client.process(
						secondReference,
						createRepresentation(
							secondReference
						)
					);

				worker.emitMessage({
					type:
						'process-result',

					requestId:
						'2',

					result: {
						requested:
							secondReference,

						found:
							true,

						resources:
							[]
					}
				});

				worker.emitMessage({
					type:
						'process-result',

					requestId:
						'1',

					result: {
						requested:
							firstReference,

						found:
							true,

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
			'rehydrates failed Resource outcomes as Error instances',
			async () => {
				const worker =
					new FakeWorker();

				const client =
					createClient(
						worker
					);

				const requested =
					createReference();

				const promise =
					client.process(
						requested,
						createRepresentation(
							requested
						)
					);

				worker.emitMessage({
					type:
						'process-result',

					requestId:
						'1',

					result: {
						requested,

						found:
							true,

						resources: [
							{
								reference:
									requested,

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
			'terminates the worker and rejects every pending process when the worker fails',
			async () => {
				const worker =
					new FakeWorker();

				const client =
					createClient(
						worker
					);

				const first =
					client.process(
						createReference(
							'kjvonly/bible/chapters/kjvs/1_1'
						),
						createRepresentation(
							createReference(
								'kjvonly/bible/chapters/kjvs/1_1'
							)
						)
					);

				const second =
					client.process(
						createReference(
							'kjvonly/strongs/definitions/kjvs/G1'
						),
						createRepresentation(
							createReference(
								'kjvonly/strongs/definitions/kjvs/G1'
							)
						)
					);

				const failure =
					new Error(
						'Child worker crashed.'
					);

				const firstRejection =
					expect(
						first
					).rejects.toBe(
						failure
					);

				const secondRejection =
					expect(
						second
					).rejects.toBe(
						failure
					);

				worker.emitError(
					failure
				);

				expect(
					worker.terminated
				).toBe(
					true
				);

				await firstRejection;
				await secondRejection;

				await expect(
					client.process(
						createReference(),
						createRepresentation(
							createReference()
						)
					)
				).rejects.toBe(
					failure
				);
			}
		);

		it(
			'terminates the worker and rejects pending processing on messageerror',
			async () => {
				const worker =
					new FakeWorker();

				const client =
					createClient(
						worker
					);

				const pending =
					client.process(
						createReference(),
						createRepresentation(
							createReference()
						)
					);

				const rejection =
					expect(
						pending
					).rejects.toThrow(
						'Resource child worker message could not be deserialized.'
					);

				worker.emitMessageError();

				expect(
					worker.terminated
				).toBe(
					true
				);

				await rejection;
			}
		);

		it(
			'terminates the worker and rejects pending processing when disposed',
			async () => {
				const worker =
					new FakeWorker();

				const client =
					createClient(
						worker
					);

				const pending =
					client.process(
						createReference(),
						createRepresentation(
							createReference()
						)
					);

				const rejection =
					expect(
						pending
					).rejects.toThrow(
						'Resource child worker has been disposed.'
					);

				client.dispose();

				expect(
					worker.terminated
				).toBe(
					true
				);

				await rejection;

				await expect(
					client.process(
						createReference(),
						createRepresentation(
							createReference()
						)
					)
				).rejects.toThrow(
					'Resource child worker has been disposed.'
				);
			}
		);

		it(
			'removes a request when postMessage throws',
			async () => {
				const worker =
					new FakeWorker();

				const failure =
					new Error(
						'postMessage failed.'
					);

				worker.postMessageError =
					failure;

				const client =
					createClient(
						worker
					);

				await expect(
					client.process(
						createReference(),
						createRepresentation(
							createReference()
						)
					)
				).rejects.toBe(
					failure
				);

				worker.postMessageError =
					undefined;

				const retry =
					client.process(
						createReference(),
						createRepresentation(
							createReference()
						)
					);

				expect(
					worker.messages
						.at(
							-1
						)
						?.requestId
				).toBe(
					'2'
				);

				worker.emitMessage({
					type:
						'process-result',

					requestId:
						'2',

					result: {
						requested:
							createReference(),

						found:
							true,

						resources:
							[]
					}
				});

				await expect(
					retry
				).resolves.toMatchObject({
					found:
						true
				});
			}
		);
	}
);

function createClient(
	worker:
		FakeWorker
): ResourceChildWorkerClient {

	return new ResourceChildWorkerClient(
		worker as unknown as
			Worker
	);
}

function createReference(
	resourceId:
		string =
			'kjvonly/bible/chapters/kjvs/1_1'
): PublishedResourceReference {

	return {
		publisher:
			'publisher',

		resourceId
	};
}

function createRepresentation(
	reference:
		PublishedResourceReference
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

		representation:
			'content',

		mediaType:
			'application/json',

		payload:
			'{}'
	};
}

class FakeWorker {

	readonly messages:
		ResourceChildWorkerRequest[] =
			[];

	terminated =
		false;

	postMessageError:
		Error |
		undefined;

	private readonly messageListeners =
		new Set<
			(
				event:
					MessageEvent<
						ResourceChildWorkerMessage
					>
			) => void
		>();

	private readonly errorListeners =
		new Set<
			(
				event:
					ErrorEvent
			) => void
		>();

	private readonly messageErrorListeners =
		new Set<
			(
				event:
					MessageEvent
			) => void
		>();

	postMessage(
		message:
			ResourceChildWorkerRequest
	): void {

		if (
			this.postMessageError !==
			undefined
		) {
			throw this.postMessageError;
		}

		this.messages.push(
			message
		);
	}

	addEventListener(
		type:
			string,

		listener:
			EventListenerOrEventListenerObject
	): void {

		const callback =
			listener as unknown as
				(
					event:
						unknown
				) => void;

		if (
			type ===
			'message'
		) {
			this.messageListeners.add(
				callback as (
					event:
						MessageEvent<
							ResourceChildWorkerMessage
						>
				) => void
			);

			return;
		}

		if (
			type ===
			'error'
		) {
			this.errorListeners.add(
				callback as (
					event:
						ErrorEvent
				) => void
			);

			return;
		}

		if (
			type ===
			'messageerror'
		) {
			this.messageErrorListeners.add(
				callback as (
					event:
						MessageEvent
				) => void
			);
		}
	}

	removeEventListener(
		type:
			string,

		listener:
			EventListenerOrEventListenerObject
	): void {

		const callback =
			listener as unknown as
				(
					event:
						unknown
				) => void;

		if (
			type ===
			'message'
		) {
			this.messageListeners.delete(
				callback as (
					event:
						MessageEvent<
							ResourceChildWorkerMessage
						>
				) => void
			);

			return;
		}

		if (
			type ===
			'error'
		) {
			this.errorListeners.delete(
				callback as (
					event:
						ErrorEvent
				) => void
			);

			return;
		}

		if (
			type ===
			'messageerror'
		) {
			this.messageErrorListeners.delete(
				callback as (
					event:
						MessageEvent
				) => void
			);
		}
	}

	terminate(): void {

		this.terminated =
			true;
	}

	emitMessage(
		message:
			ResourceChildWorkerMessage
	): void {

		const event = {
			data:
				message
		} as MessageEvent<
			ResourceChildWorkerMessage
		>;

		for (
			const listener
			of this.messageListeners
		) {
			listener(
				event
			);
		}
	}

	emitError(
		error:
			Error
	): void {

		const event = {
			error,
			message:
				error.message
		} as ErrorEvent;

		for (
			const listener
			of this.errorListeners
		) {
			listener(
				event
			);
		}
	}

	emitMessageError(): void {

		const event =
			{} as MessageEvent;

		for (
			const listener
			of this.messageErrorListeners
		) {
			listener(
				event
			);
		}
	}
}
