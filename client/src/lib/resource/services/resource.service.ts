import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	ResourceDiscovery
} from '$lib/resource/nostr/resource-discovery';

import type {
	ResourceInstallResult
} from './resource-install-result';

import type {
	ResourceProcessor
} from './resource-processor';

export class ResourceService {

	private readonly inFlightInstalls =
		new Map<
			string,
			Promise<ResourceInstallResult>
		>();

	constructor(
		private readonly discovery:
			Pick<
				ResourceDiscovery,
				'get'
			>,

		private readonly processor:
			Pick<
				ResourceProcessor,
				'process'
			>
	) {}

	install(
		reference:
			PublishedResourceReference
	): Promise<ResourceInstallResult> {

		const key =
			this.createInstallKey(
				reference
			);

		const inFlight =
			this.inFlightInstalls.get(
				key
			);

		if (
			inFlight !==
			undefined
		) {
			return inFlight;
		}

		const install =
			this.installResource(
				reference
			);

		this.inFlightInstalls.set(
			key,
			install
		);

		void install.then(
			() =>
				this.clearInFlightInstall(
					key,
					install
				),

			() =>
				this.clearInFlightInstall(
					key,
					install
				)
		);

		return install;
	}

	private async installResource(
		reference:
			PublishedResourceReference
	): Promise<ResourceInstallResult> {

		const representation =
			await this.discovery.get(
				reference
			);

		if (
			representation === null
		) {
			return {
				requested:
					reference,

				found:
					false,

				resources:
					[]
			};
		}

		return this.processor.process(
			reference,
			representation
		);
	}

	private createInstallKey(
		reference:
			PublishedResourceReference
	): string {

		return JSON.stringify([
			reference.publisher,
			reference.resourceId
		]);
	}

	private clearInFlightInstall(
		key:
			string,

		install:
			Promise<ResourceInstallResult>
	): void {

		if (
			this.inFlightInstalls.get(
				key
			) !==
			install
		) {
			return;
		}

		this.inFlightInstalls.delete(
			key
		);
	}
}
