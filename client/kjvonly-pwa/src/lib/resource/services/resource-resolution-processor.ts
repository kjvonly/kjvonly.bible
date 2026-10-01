import type {
	DecodedResourceContent,
	PublishedResourceReference,
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceResolutionCurrent,
	ResourceResolutionFailure,
	ResourceResolutionResult
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


/**
 * Processes resolved Resource content through the installation side of the
 * generic Resource lifecycle.
 *
 * This class owns resolution-outcome mapping, content decoding, ResourceHandler
 * dispatch, Domain handling, and receipt recording after successful handling.
 * It does not perform Resource discovery or representation resolution.
 */
export class ResourceResolutionProcessor {

	private readonly handlers:
		ReadonlyMap<
			string,
			ResourceHandler
		>;

	constructor(
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
			const handler
			of handlers
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

	/**
	 * Converts an existing ResourceResolutionResult into installation outcomes,
	 * preserving failed/current entries and processing terminal contents.
	 */
	async process(
		requested:
			PublishedResourceReference,

		resolution:
			ResourceResolutionResult
	): Promise<ResourceInstallResult> {

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

	/**
	 * Processes content that has already passed generic Resource decoding.
	 *
	 * This entry point is shared with archive import, which restores decoded
	 * Resource values without re-running representation resolution or decoding.
	 */
	async processDecoded(
		content:
			DecodedResourceContent
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
			handler ===
			undefined
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
			await handler.handle(
				content
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

	/**
	 * Converts one current resolution outcome into its installation result form.
	 */
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

	/**
	 * Converts one resolution failure into its installation result form while
	 * preserving Resource identity only when the resolution stage established it.
	 */
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

	/**
	 * Decodes one verified terminal Resource before delegating decoded handling.
	 */
	private async processContent(
		content:
			VerifiedResourceContent
	): Promise<ResourceInstallOutcome> {
		if (
			!this.handlers.has(
				content.resourceType
			)
		) {
			return {
				reference: {
					publisher:
						content.publisher,

					resourceId:
						content.resourceId
				},

				resourceType:
					content.resourceType,

				status:
					'unsupported'
			};
		}

		let decoded:
			DecodedResourceContent;

		try {
			decoded =
				await this.decoder.decode(
					content
				);
		} catch (error) {
			return {
				reference: {
					publisher:
						content.publisher,

					resourceId:
						content.resourceId
				},

				resourceType:
					content.resourceType,

				status:
					'failed',

				error
			};
		}

		return this.processDecoded(
			decoded
		);
	}
}
