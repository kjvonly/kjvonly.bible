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
	ResourceWorkerDiscovery,
	type ResourceWorkerDiscoveryPort
} from './resource-worker-discovery';

import type {
	ResourceWorkerMainMessage,
	ResourceWorkerMessage
} from './resource-worker-message';

describe(
	'ResourceWorkerDiscovery',
	() => {

		it(
			'requests discovery from the main thread',
			async () => {
				const port =
					new FakePort();

				const discovery =
					new ResourceWorkerDiscovery(
						port
					);

				const reference =
					createReference();

				const promise =
					discovery.get(
						reference
					);

				expect(
					port.messages
				).toEqual([
					{
						type:
							'discovery',

						requestId:
							'discovery-1',

						reference
					}
				]);

				port.emit({
					type:
						'discovery-result',

					requestId:
						'discovery-1',

					representation:
						createRepresentation()
				});

				await expect(
					promise
				).resolves.toEqual(
					createRepresentation()
				);
			}
		);

		it(
			'preserves normal Resource absence',
			async () => {
				const port =
					new FakePort();

				const discovery =
					new ResourceWorkerDiscovery(
						port
					);

				const promise =
					discovery.get(
						createReference()
					);

				port.emit({
					type:
						'discovery-result',

					requestId:
						'discovery-1',

					representation:
						null
				});

				await expect(
					promise
				).resolves.toBeNull();
			}
		);

		it(
			'rehydrates discovery errors',
			async () => {
				const port =
					new FakePort();

				const discovery =
					new ResourceWorkerDiscovery(
						port
					);

				const promise =
					discovery.get(
						createReference()
					);

				port.emit({
					type:
						'discovery-error',

					requestId:
						'discovery-1',

					error: {
						name:
							'ResourceClientError',

						message:
							'Relay unavailable.'
					}
				});

				await expect(
					promise
				).rejects.toMatchObject({
					name:
						'ResourceClientError',

					message:
						'Relay unavailable.'
				});
			}
		);

		it(
			'matches concurrent discovery responses by request id',
			async () => {
				const port =
					new FakePort();

				const discovery =
					new ResourceWorkerDiscovery(
						port
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
					discovery.get(
						firstReference
					);

				const second =
					discovery.get(
						secondReference
					);

				const secondRepresentation =
					createRepresentation({
						publisher:
							secondReference.publisher,

						resourceId:
							secondReference.resourceId,

						resourceType:
							'kjvonly/strongs/definitions'
					});

				const firstRepresentation =
					createRepresentation({
						publisher:
							firstReference.publisher,

						resourceId:
							firstReference.resourceId,

						resourceType:
							'kjvonly/bible/chapters'
					});

				/*
				 * Return them in the opposite order.
				 */
				port.emit({
					type:
						'discovery-result',

					requestId:
						'discovery-2',

					representation:
						secondRepresentation
				});

				port.emit({
					type:
						'discovery-result',

					requestId:
						'discovery-1',

					representation:
						firstRepresentation
				});

				await expect(
					first
				).resolves.toEqual(
					firstRepresentation
				);

				await expect(
					second
				).resolves.toEqual(
					secondRepresentation
				);
			}
		);

		it(
			'ignores discovery responses for unknown request ids',
			async () => {
				const port =
					new FakePort();

				new ResourceWorkerDiscovery(
					port
				);

				expect(
					() =>
						port.emit({
							type:
								'discovery-result',

							requestId:
								'unknown',

							representation:
								null
						})
				).not.toThrow();
			}
		);

		it(
			'rejects pending discovery when disposed',
			async () => {
				const port =
					new FakePort();

				const discovery =
					new ResourceWorkerDiscovery(
						port
					);

				const promise =
					discovery.get(
						createReference()
					);

				discovery.dispose();

				await expect(
					promise
				).rejects.toThrow(
					'Resource worker discovery was disposed.'
				);
			}
		);

		it(
			'rejects new discovery after disposal',
			async () => {
				const port =
					new FakePort();

				const discovery =
					new ResourceWorkerDiscovery(
						port
					);

				discovery.dispose();

				await expect(
					discovery.get(
						createReference()
					)
				).rejects.toThrow(
					'Resource worker discovery is disposed.'
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

function createRepresentation(
	overrides:
		Partial<
			ResourceRepresentation
		> = {}
): ResourceRepresentation {

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
			'[]',

		...overrides
	};
}

class FakePort
	implements ResourceWorkerDiscoveryPort {

	readonly messages:
		ResourceWorkerMessage[] =
			[];

	private readonly listeners =
		new Set<
			(
				event:
					MessageEvent<
						ResourceWorkerMainMessage
					>
			) => void
		>();

	postMessage(
		message:
			ResourceWorkerMessage
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
						ResourceWorkerMainMessage
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
						ResourceWorkerMainMessage
					>
			) => void
	): void {

		this.listeners.delete(
			listener
		);
	}

	emit(
		message:
			ResourceWorkerMainMessage
	): void {

		const event = {
			data:
				message
		} as MessageEvent<
			ResourceWorkerMainMessage
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