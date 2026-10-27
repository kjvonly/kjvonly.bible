import type {
	PublishedResourceReference,
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import type {
	ResourceDiscovery
} from '$lib/resource/nostr/resource-discovery';

import {
	deserializeResourceWorkerError,
	type ResourceWorkerMainMessage,
	type ResourceWorkerMessage
} from './resource-worker-message';

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

export interface ResourceWorkerDiscoveryPort {
	postMessage(
		message:
			ResourceWorkerMessage
	): void;

	addEventListener(
		type:
			'message',

		listener:
			(
				event:
					MessageEvent<
						ResourceWorkerMainMessage
					>
			) => void
	): void;

	removeEventListener(
		type:
			'message',

		listener:
			(
				event:
					MessageEvent<
						ResourceWorkerMainMessage
					>
			) => void
	): void;
}

export class ResourceWorkerDiscovery
	implements Pick<
		ResourceDiscovery,
		'get'
	> {

	private readonly pending =
		new Map<
			string,
			PendingDiscovery
		>();

	private nextRequestId =
		0;

	private disposed =
		false;

	constructor(
		private readonly port:
			ResourceWorkerDiscoveryPort
	) {
		this.port
			.addEventListener(
				'message',
				this.handleMessage
			);
	}

	get(
		reference:
			PublishedResourceReference
	): Promise<
		ResourceRepresentation |
		null
	> {

		if (
			this.disposed
		) {
			return Promise.reject(
				new Error(
					'Resource worker discovery is disposed.'
				)
			);
		}

		const requestId =
			this.createRequestId();

		return new Promise(
			(
				resolve,
				reject
			) => {

				this.pending.set(
					requestId,
					{
						resolve,
						reject
					}
				);

				try {
					this.port
						.postMessage({
							type:
								'discovery',

							requestId,

							reference
						});
				} catch (error) {
					this.pending
						.delete(
							requestId
						);

					reject(
						error
					);
				}
			}
		);
	}

	dispose():
		void {

		if (
			this.disposed
		) {
			return;
		}

		this.disposed =
			true;

		this.port
			.removeEventListener(
				'message',
				this.handleMessage
			);

		const error =
			new Error(
				'Resource worker discovery was disposed.'
			);

		for (
			const pending
			of this.pending.values()
		) {
			pending.reject(
				error
			);
		}

		this.pending.clear();
	}

	private readonly handleMessage =
		(
			event:
				MessageEvent<
					ResourceWorkerMainMessage
				>
		): void => {

			const message =
				event.data;

			switch (
				message.type
			) {
				case 'discovery-result': {
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

					pending.resolve(
						message.representation
					);

					return;
				}

				case 'discovery-error': {
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

					pending.reject(
						deserializeResourceWorkerError(
							message.error
						)
					);

					return;
				}

				case 'install':
					return;
			}
		};

	private createRequestId():
		string {

		this.nextRequestId++;

		return (
			`discovery-${this.nextRequestId}`
		);
	}
}