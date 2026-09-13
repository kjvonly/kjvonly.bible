import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import {
	deserializeResourceWorkerError
} from './resource-worker-message';

import type {
	ResourceWorkerStrategyResolveRequest,
	ResourceWorkerStrategyResolveResponse
} from './resource-worker-strategy-message';

interface PendingStrategyResolution {
	readonly resolve:
		(content: Uint8Array) => void;

	readonly reject:
		(error: unknown) => void;
}

export interface ResourceWorkerStrategyResolverPort {
	postMessage(
		message:
			ResourceWorkerStrategyResolveRequest
	): void;

	addEventListener(
		type:
			'message',

		listener:
			(
				event:
					MessageEvent<
						ResourceWorkerStrategyResolveResponse |
						unknown
					>
			) => void
	): void;
}

export class ResourceWorkerStrategyResolver {
	private readonly pending =
		new Map<
			string,
			PendingStrategyResolution
		>();

	private nextRequestId =
		0;

	constructor(
		private readonly port:
			ResourceWorkerStrategyResolverPort
	) {
		this.port.addEventListener(
			'message',
			this.handleMessage
		);
	}

	resolve(
		descriptor:
			ResourceDescriptor
	): Promise<Uint8Array> {
		const requestId =
			`strategy-${++this.nextRequestId}`;

		return new Promise(
			(resolve, reject) => {
				this.pending.set(
					requestId,
					{
						resolve,
						reject
					}
				);

				try {
					this.port.postMessage({
						type:
							'strategy-resolve',
						requestId,
						descriptor
					});
				} catch (error) {
					this.pending.delete(
						requestId
					);

					reject(
						error
					);
				}
			}
		);
	}

	private readonly handleMessage =
		(
			event:
				MessageEvent<unknown>
		): void => {
			const message =
				event.data;

			if (
				!isStrategyResponse(
					message
				)
			) {
				return;
			}

			const pending =
				this.pending.get(
					message.requestId
				);

			if (
				pending ===
				undefined
			) {
				return;
			}

			this.pending.delete(
				message.requestId
			);

			if (
				message.type ===
				'strategy-resolve-result'
			) {
				pending.resolve(
					message.content
				);

				return;
			}

			pending.reject(
				deserializeResourceWorkerError(
					message.error
				)
			);
		};
}

function isStrategyResponse(
	value:
		unknown
): value is ResourceWorkerStrategyResolveResponse {
	if (
		typeof value !==
		'object' ||
		value ===
		null
	) {
		return false;
	}

	const type =
		Reflect.get(
			value,
			'type'
		);

	return (
		type ===
			'strategy-resolve-result' ||
		type ===
			'strategy-resolve-error'
	);
}
