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

type ResourceWorkerClientState =
	| 'active'
	| 'failed'
	| 'disposed';

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

	addEventListener(
		type:
			'error',

		listener:
			(
				event:
					ErrorEvent
			) => void
	): void;

	addEventListener(
		type:
			'messageerror',

		listener:
			(
				event:
					MessageEvent
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

	removeEventListener(
		type:
			'error',

		listener:
			(
				event:
					ErrorEvent
			) => void
	): void;

	removeEventListener(
		type:
			'messageerror',

		listener:
			(
				event:
					MessageEvent
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

	private state:
		ResourceWorkerClientState =
		'active';

	private terminalError:
		Error |
		undefined;

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

		this.worker
			.addEventListener(
				'error',
				this.handleWorkerError
			);

		this.worker
			.addEventListener(
				'messageerror',
				this.handleWorkerMessageError
			);
	}

	install(
		reference:
			PublishedResourceReference
	): Promise<
		ResourceInstallResult
	> {

		if (
			this.state !==
			'active'
		) {
			return Promise.reject(
				this.terminalError ??
				new Error(
					'Resource worker client is unavailable.'
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

				this.pendingInstalls
					.set(
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
			this.state ===
			'disposed'
		) {
			return;
		}

		const error =
			new Error(
				'Resource worker client was disposed.'
			);

		/*
		 * A failed worker has already been terminated
		 * and all pending operations have already been
		 * rejected.
		 *
		 * Disposal still changes the public lifecycle
		 * state so future operations report disposal
		 * rather than the previous worker failure.
		 */
		if (
			this.state ===
			'failed'
		) {
			this.state =
				'disposed';

			this.terminalError =
				error;

			return;
		}

		this.close(
			'disposed',
			error
		);
	}

	private readonly handleMessage =
		(
			event:
				MessageEvent<
					ResourceWorkerMessage
				>
		): void => {

			if (
				this.state !==
				'active'
			) {
				return;
			}

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

	private readonly handleWorkerError =
		(
			event:
				ErrorEvent
		): void => {

			if (
				this.state !==
				'active'
			) {
				return;
			}

			const error =
				this.createWorkerError(
					event
				);

			this.close(
				'failed',
				error
			);
		};

	private readonly handleWorkerMessageError =
		(
			_event:
				MessageEvent
		): void => {

			if (
				this.state !==
				'active'
			) {
				return;
			}

			const error =
				new Error(
					'Resource worker message could not be deserialized.'
				);

			error.name =
				'ResourceWorkerError';

			this.close(
				'failed',
				error
			);
		};

	private async handleDiscovery(
		requestId:
			string,

		reference:
			PublishedResourceReference
	): Promise<void> {

		try {
			const representation =
				await this.discovery
					.get(
						reference
					);

			/*
			 * Discovery may finish after the worker has
			 * failed or the Application has been stopped.
			 *
			 * The result has nowhere valid to go in that
			 * case and must simply be discarded.
			 */
			if (
				this.state !==
				'active'
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
				this.state !==
				'active'
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

	private close(
		state:
			Exclude<
				ResourceWorkerClientState,
				'active'
			>,

		error:
			Error
	): void {

		if (
			this.state !==
			'active'
		) {
			return;
		}

		this.state =
			state;

		this.terminalError =
			error;

		this.worker
			.removeEventListener(
				'message',
				this.handleMessage
			);

		this.worker
			.removeEventListener(
				'error',
				this.handleWorkerError
			);

		this.worker
			.removeEventListener(
				'messageerror',
				this.handleWorkerMessageError
			);

		this.worker
			.terminate();

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

	private createWorkerError(
		event:
			ErrorEvent
	): Error {

		if (
			event.error instanceof
			Error
		) {
			return event.error;
		}

		const message =
			event.message
				.trim();

		const error =
			new Error(
				message.length >
				0
					? message
					: 'Resource worker failed.'
			);

		error.name =
			'ResourceWorkerError';

		return error;
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

///////////////////////////////////////////////////////////////////////////////

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