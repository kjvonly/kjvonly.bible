import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	ResourceDiscovery
} from '$lib/resource/nostr/resource-discovery';

import type {
	ResourceInstallResult
} from './resource-install-result';

import type {
	ResourceProcessor
} from './resource-processor';

interface KnownResourceDescriptorProcessor {
	processDescriptor(
		descriptor:
			ResourceDescriptor
	): Promise<ResourceInstallResult>;
}

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
			>,

		private readonly descriptorProcessor?:
			KnownResourceDescriptorProcessor
	) {}

	install(
		reference:
			PublishedResourceReference
	): Promise<ResourceInstallResult> {

		return this.runInstall(
			this.createInstallKey(
				reference
			),
			() =>
				this.installResource(
					reference
				)
		);
	}

	/**
	 * Installs one already-known ResourceDescriptor without Resource discovery.
	 *
	 * The descriptor operation still participates in ResourceService in-flight
	 * coordination so repeated requests for the same descriptor revision share
	 * one installation lifecycle.
	 */
	installDescriptor(
		descriptor:
			ResourceDescriptor
	): Promise<ResourceInstallResult> {
		const descriptorProcessor =
			this.descriptorProcessor;

		if (
			descriptorProcessor ===
				undefined
		) {
			return Promise.reject(
				new Error(
					'Resource descriptor installation is unavailable.'
				)
			);
		}

		return this.runInstall(
			this.createDescriptorInstallKey(
				descriptor
			),
			() =>
				descriptorProcessor.processDescriptor(
					descriptor
				)
		);
	}

	private runInstall(
		key:
			string,

		create:
			() => Promise<ResourceInstallResult>
	): Promise<ResourceInstallResult> {
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
			create();

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
			'reference',
			reference.publisher,
			reference.resourceId
		]);
	}

	private createDescriptorInstallKey(
		descriptor:
			ResourceDescriptor
	): string {
		return JSON.stringify([
			'descriptor',
			descriptor.metadata.publisher,
			descriptor.metadata.resourceId,
			descriptor.metadata.modifiedAt
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
