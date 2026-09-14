import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import {
	ResourceWorkerStrategyResolver,
	type ResourceWorkerStrategyResolverPort
} from './resource-worker-strategy-resolver';

import type {
	ResourceWorkerStrategyResolveRequest,
	ResourceWorkerStrategyResolveResponse
} from './resource-worker-strategy-message';

describe(
	'ResourceWorkerStrategyResolver',
	() => {
		it(
			'sends strategy resolution requests and resolves returned content',
			async () => {
				const port =
					new FakePort();

				const resolver =
					new ResourceWorkerStrategyResolver(
						port
					);

				const descriptor =
					createDescriptor();

				const pending =
					resolver.resolve(
						descriptor
					);

				expect(
					port.messages
				).toEqual([
					{
						type:
							'strategy-resolve',

						requestId:
							'strategy-1',

						descriptor
					}
				]);

				const content =
					new Uint8Array([
						1,
						2
					]);

				port.emit({
					type:
						'strategy-resolve-result',

					requestId:
						'strategy-1',

					content
				});

				await expect(
					pending
				).resolves.toEqual(
					content
				);
			}
		);

		it(
			'rehydrates strategy resolution errors',
			async () => {
				const port =
					new FakePort();

				const resolver =
					new ResourceWorkerStrategyResolver(
						port
					);

				const pending =
					resolver.resolve(
						createDescriptor()
					);

				const rejection =
					expect(
						pending
					).rejects.toThrow(
						'Nostr failed.'
					);

				port.emit({
					type:
						'strategy-resolve-error',

					requestId:
						'strategy-1',

					error: {
						name:
							'Error',

						message:
							'Nostr failed.'
					}
				});

				await rejection;
			}
		);
	}
);

function createDescriptor():
	ResourceDescriptor {
	return {
		metadata: {
			publisher:
				'a'.repeat(
					64
				),

			resourceId:
				'kjvonly/plans/readings/default',

			category:
				'kjvonly/plans/readings',

			modifiedAt:
				100,

			representation:
				'descriptors',

			mediaType:
				'application/json+hex'
		},

		strategy: {
			type:
				'nostr',

			data:
				{}
		}
	};
}

class FakePort
	implements ResourceWorkerStrategyResolverPort {

	readonly messages:
		ResourceWorkerStrategyResolveRequest[] =
			[];

	private readonly listeners =
		new Set<
			(
				event:
					MessageEvent<unknown>
			) => void
		>();

	postMessage(
		message:
			ResourceWorkerStrategyResolveRequest
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
					MessageEvent<unknown>
			) => void
	): void {
		this.listeners.add(
			listener
		);
	}

	emit(
		message:
			ResourceWorkerStrategyResolveResponse
	): void {
		const event = {
			data:
				message
		} as MessageEvent<unknown>;

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
