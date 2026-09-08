import type {
	PublishedResourceReference,
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import type {
	ResourceInstallResult
} from '$lib/resource/services/resource-install-result';

import type {
	ResourceChildWorkerClient
} from './resource-child-worker-client';

type DescriptorWorkerClient =
	Pick<
		ResourceChildWorkerClient,
		'process'
	>;

type DescriptorWorkerClients =
	readonly [
		DescriptorWorkerClient,
		DescriptorWorkerClient,
		DescriptorWorkerClient
	];

interface DescriptorWorkerSlot {
	readonly client:
		DescriptorWorkerClient;

	busy:
		boolean;
}

interface DescriptorWorkerJob {
	readonly requested:
		PublishedResourceReference;

	readonly representation:
		ResourceRepresentation;

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

export class ResourceDescriptorWorkerPool {

	private readonly slots:
		DescriptorWorkerSlot[];

	private readonly queue:
		DescriptorWorkerJob[] =
			[];

	constructor(
		clients:
			DescriptorWorkerClients
	) {
		this.slots =
			clients.map(
				(client) => ({
					client,
					busy:
						false
				})
			);
	}

	process(
		requested:
			PublishedResourceReference,

		representation:
			ResourceRepresentation
	): Promise<ResourceInstallResult> {

		return new Promise(
			(
				resolve,
				reject
			) => {

				const job:
					DescriptorWorkerJob = {
					requested,
					representation,
					resolve,
					reject
				};

				const slot =
					this.slots.find(
						(candidate) =>
							!candidate.busy
					);

				if (
					slot ===
					undefined
				) {
					this.queue.push(
						job
					);

					return;
				}

				this.dispatch(
					slot,
					job
				);
			}
		);
	}

	private dispatch(
		slot:
			DescriptorWorkerSlot,

		job:
			DescriptorWorkerJob
	): void {

		slot.busy =
			true;

		let processing:
			Promise<ResourceInstallResult>;

		try {
			processing =
				slot.client.process(
					job.requested,
					job.representation
				);
		} catch (error) {
			this.release(
				slot
			);

			job.reject(
				error
			);

			return;
		}

		void processing.then(
			(result) => {
				this.release(
					slot
				);

				job.resolve(
					result
				);
			},

			(error) => {
				this.release(
					slot
				);

				job.reject(
					error
				);
			}
		);
	}

	private release(
		slot:
			DescriptorWorkerSlot
	): void {

		slot.busy =
			false;

		const next =
			this.queue.shift();

		if (
			next ===
			undefined
		) {
			return;
		}

		this.dispatch(
			slot,
			next
		);
	}
}
