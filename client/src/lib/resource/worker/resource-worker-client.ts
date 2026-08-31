import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	ResourceDiscovery
} from '$lib/resource/nostr/resource-discovery';

import type {
	ResourceInstallResult
} from '$lib/resource/services/resource-install-result';

import {
	deserializeResourceWorkerError,
	deserializeResourceWorkerInstallResult,
	serializeResourceWorkerError,
	type ResourceWorkerMainMessage,
	type ResourceWorkerMessage
} from './resource-worker-message';

interface PendingInstall {
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

export interface ResourceWorkerPort {
	postMessage(
		message:
			ResourceWorkerMainMessage
	): void;

	addEventListener(
		type:
			'message',

		listener:
			(
				event:
					MessageEvent<
						ResourceWorkerMessage
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
						ResourceWorkerMessage
					>
			) => void
	): void;

	terminate():
		void;
}

export class ResourceWorkerClient {

	private readonly pendingInstalls =
		new Map<
			string,
			PendingInstall
		>();

	private nextRequestId =
		0;

	private disposed =
		false;

	constructor(
		private readonly worker:
			ResourceWorkerPort,

		private readonly discovery:
			Pick<
				ResourceDiscovery,
				'get'
			>
	) {
		this.worker
			.addEventListener(
				'message',
				this.handleMessage
			);
	}

	install(
		reference:
			PublishedResourceReference
	): Promise<
		ResourceInstallResult
	> {

		if (
			this.disposed
		) {
			return Promise.reject(
				new Error(
					'Resource worker client is disposed.'
				)
			);
		}

		const requestId =
			this.createRequestId(
				'install'
			);

		return new Promise(
			(
				resolve,
				reject
			) => {
				this.pendingInstalls.set(
					requestId,
					{
						resolve,
						reject
					}
				);

				try {
					this.worker
						.postMessage({
							type:
								'install',

							requestId,

							reference
						});
				} catch (error) {
					this.pendingInstalls
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

		this.worker
			.removeEventListener(
				'message',
				this.handleMessage
			);

		this.worker
			.terminate();

		const error =
			new Error(
				'Resource worker client was disposed.'
			);

		for (
			const pending
			of this.pendingInstalls
				.values()
		) {
			pending.reject(
				error
			);
		}

		this.pendingInstalls
			.clear();
	}

	private readonly handleMessage =
		(
			event:
				MessageEvent<
					ResourceWorkerMessage
				>
		): void => {

			const message =
				event.data;

			switch (
				message.type
			) {
				case 'discovery':
					void this.handleDiscovery(
						message.requestId,
						message.reference
					);

					return;

				case 'install-result': {
					const pending =
						this.pendingInstalls
							.get(
								message.requestId
							);

					if (
						pending ===
						undefined
					) {
						return;
					}

					this.pendingInstalls
						.delete(
							message.requestId
						);

					pending.resolve(
						deserializeResourceWorkerInstallResult(
							message.result
						)
					);

					return;
				}

				case 'install-error': {
					const pending =
						this.pendingInstalls
							.get(
								message.requestId
							);

					if (
						pending ===
						undefined
					) {
						return;
					}

					this.pendingInstalls
						.delete(
							message.requestId
						);

					pending.reject(
						deserializeResourceWorkerError(
							message.error
						)
					);

					return;
				}
			}
		};

	private async handleDiscovery(
		requestId:
			string,

		reference:
			PublishedResourceReference
	): Promise<void> {

		try {
			const representation =
				await this.discovery.get(
					reference
				);

			if (
				this.disposed
			) {
				return;
			}

			this.worker
				.postMessage({
					type:
						'discovery-result',

					requestId,

					representation
				});
		} catch (error) {
			if (
				this.disposed
			) {
				return;
			}

			this.worker
				.postMessage({
					type:
						'discovery-error',

					requestId,

					error:
						serializeResourceWorkerError(
							error
						)
				});
		}
	}

	private createRequestId(
		prefix:
			string
	): string {

		this.nextRequestId++;

		return (
			`${prefix}-${this.nextRequestId}`
		);
	}
}

export function createBrowserResourceWorkerClient(
	discovery:
		Pick<
			ResourceDiscovery,
			'get'
		>
): ResourceWorkerClient {

	const worker =
		new Worker(
			new URL(
				'./resource.worker.ts',
				import.meta.url
			),
			{
				type:
					'module'
			}
		);

	return new ResourceWorkerClient(
		worker,
		discovery
	);
}