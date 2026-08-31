import type {
	PublishedResourceReference,
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceDiscovery
} from '$lib/resource/nostr/resource-discovery';

import type {
	ResourceResolver
} from '$lib/resource/resolution/resource-resolver';

import type {
	ResourceResolutionFailure
} from '$lib/resource/resolution/resource-resolution-result';

import type {
	ResourceContentDecoder
} from '$lib/resource/content/resource-content-decoder';

import type {
	ResourceHandler
} from '$lib/resource/installation/resource-handler';

import type {
	ResourceReceiptService
} from '$lib/resource/receipts/resource-receipt.service';

import type {
	ResourceInstallOutcome,
	ResourceInstallResult
} from './resource-install-result';

export class ResourceService {

	private readonly handlers:
		ReadonlyMap<
			string,
			ResourceHandler
		>;

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

		private readonly resolver:
			Pick<
				ResourceResolver,
				'resolve'
			>,

		private readonly decoder:
			Pick<
				ResourceContentDecoder,
				'decode'
			>,

		private readonly receipts:
			Pick<
				ResourceReceiptService,
				'markProcessed'
			>,

		handlers:
			readonly ResourceHandler[]
	) {
		const handlerMap =
			new Map<
				string,
				ResourceHandler
			>();

		for (
			const handler of handlers
		) {
			if (
				handlerMap.has(
					handler.resourceType
				)
			) {
				throw new Error(
					`Duplicate Resource handler: ${handler.resourceType}`
				);
			}

			handlerMap.set(
				handler.resourceType,
				handler
			);
		}

		this.handlers =
			handlerMap;
	}

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

		const resolution =
			await this.resolver.resolve(
				representation
			);

		const resources:
			ResourceInstallOutcome[] =
				resolution.failures.map(
					(failure) =>
						this.createFailureOutcome(
							failure
						)
				);

		for (
			const content
			of resolution.contents
		) {
			resources.push(
				await this.process(
					content
				)
			);
		}

		return {
			requested:
				reference,

			found:
				true,

			resources
		};
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

	private createFailureOutcome(
		failure:
			ResourceResolutionFailure
	): ResourceInstallOutcome {
		return {
			...(
				failure.publisher !==
					undefined &&
				failure.resourceId !==
					undefined
					? {
							reference: {
								publisher:
									failure.publisher,

								resourceId:
									failure.resourceId
							}
						}
					: {}
			),

			...(
				failure.resourceType !==
					undefined
					? {
							resourceType:
								failure.resourceType
						}
					: {}
			),

			status:
				'failed',

			error:
				failure.error
		};
	}

	private async process(
		content:
			VerifiedResourceContent
	): Promise<ResourceInstallOutcome> {
		const reference:
			PublishedResourceReference = {
			publisher:
				content.publisher,

			resourceId:
				content.resourceId
		};

		const handler =
			this.handlers.get(
				content.resourceType
			);

		if (
			handler === undefined
		) {
			return {
				reference,
				resourceType:
					content.resourceType,
				status:
					'unsupported'
			};
		}

		try {
			const decoded =
				await this.decoder.decode(
					content
				);

			await handler.handle(
				decoded
			);
		} catch (error) {
			return {
				reference,
				resourceType:
					content.resourceType,
				status:
					'failed',
				error
			};
		}

		try {
			await this.receipts.markProcessed(
				content.publisher,
				content.resourceId,
				content.modifiedAt
			);
		} catch (error) {
			console.warn(
				'[Resource receipt write failed]',
				{
					publisher:
						content.publisher,

					resourceId:
						content.resourceId,

					modifiedAt:
						content.modifiedAt,

					error
				}
			);
		}

		return {
			reference,
			resourceType:
				content.resourceType,
			status:
				'handled'
		};
	}
}
