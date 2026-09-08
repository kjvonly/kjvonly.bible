import type {
	PublishedResourceReference,
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import type {
	ResourceInstallResult
} from '$lib/resource/services/resource-install-result';

import type { 
	ResourceChildWorkerMessage, 
	ResourceChildWorkerRequest 
} from './resource-child-worker-message';

import {
	deserializeResourceWorkerError,
	deserializeResourceWorkerInstallResult
} from './resource-worker-message';



interface PendingResourceChildWorkerRequest {
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

export class ResourceChildWorkerClient {

	private readonly pending =
		new Map<
			string,
			PendingResourceChildWorkerRequest
		>();

	private nextRequestId =
		0;

	private failure:
		Error |
		undefined;

	private disposed =
		false;

	constructor(
		private readonly worker:
			Worker
	) {
		this.worker.addEventListener(
			'message',
			this.handleMessage
		);

		this.worker.addEventListener(
			'error',
			this.handleError
		);

		this.worker.addEventListener(
			'messageerror',
			this.handleMessageError
		);
	}

	process(
		requested:
			PublishedResourceReference,

		representation:
			ResourceRepresentation
	): Promise<ResourceInstallResult> {

		if (
			this.disposed
		) {
			return Promise.reject(
				new Error(
					'Resource child worker has been disposed.'
				)
			);
		}

		if (
			this.failure !==
			undefined
		) {
			return Promise.reject(
				this.failure
			);
		}

		const requestId =
			String(
				++this.nextRequestId
			);

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

				const message:
					ResourceChildWorkerRequest = {
					type:
						'process',

					requestId,

					requested,

					representation
				};

				try {
					this.worker.postMessage(
						message
					);
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

	dispose(): void {

		if (
			this.disposed
		) {
			return;
		}

		this.disposed =
			true;

		this.worker.removeEventListener(
			'message',
			this.handleMessage
		);

		this.worker.removeEventListener(
			'error',
			this.handleError
		);

		this.worker.removeEventListener(
			'messageerror',
			this.handleMessageError
		);

		this.worker.terminate();

		this.rejectPending(
			new Error(
				'Resource child worker has been disposed.'
			)
		);
	}

	private readonly handleMessage =
		(
			event:
				MessageEvent<
					ResourceChildWorkerMessage
				>
		): void => {

			const message =
				event.data;

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
				'process-result'
			) {
				pending.resolve(
					deserializeResourceWorkerInstallResult(
						message.result
					)
				);

				return;
			}

			pending.reject(
				deserializeResourceWorkerError(
					message.error
				)
			);
		};

	private readonly handleError =
		(
			event:
				ErrorEvent
		): void => {

			this.fail(
				event.error instanceof
					Error
					? event.error
					: new Error(
						event.message ||
						'Resource child worker failed.'
					)
			);
		};

	private readonly handleMessageError =
		(): void => {

			this.fail(
				new Error(
					'Resource child worker message could not be deserialized.'
				)
			);
		};

	private fail(
		error:
			Error
	): void {

		if (
			this.failure !==
			undefined ||
			this.disposed
		) {
			return;
		}

		this.failure =
			error;

		this.worker.terminate();

		this.rejectPending(
			error
		);
	}

	private rejectPending(
		error:
			Error
	): void {

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
}
