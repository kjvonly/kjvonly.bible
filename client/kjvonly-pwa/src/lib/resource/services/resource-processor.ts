import type {
	PublishedResourceReference,
	ResourceRepresentation,
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceResolver
} from '$lib/resource/resolution/resource-resolver';

import type {
	ResourceResolutionCurrent,
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

export class ResourceProcessor {

	private readonly handlers:
		ReadonlyMap<
			string,
			ResourceHandler
		>;

	constructor(
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

	async process(
		requested:
			PublishedResourceReference,

		representation:
			ResourceRepresentation
	): Promise<ResourceInstallResult> {

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
			const current
			of resolution.current
		) {
			resources.push(
				this.createCurrentOutcome(
					current
				)
			);
		}

		for (
			const content
			of resolution.contents
		) {
			resources.push(
				await this.processContent(
					content
				)
			);
		}

		return {
			requested,
			found:
				true,
			resources
		};
	}

	private createCurrentOutcome(
		current:
			ResourceResolutionCurrent
	): ResourceInstallOutcome {

		return {
			reference: {
				publisher:
					current.publisher,

				resourceId:
					current.resourceId
			},

			resourceType:
				current.resourceType,

			status:
				'current'
		};
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

	private async processContent(
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