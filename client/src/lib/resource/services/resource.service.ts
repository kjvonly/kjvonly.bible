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
	ResourceContentDecoder
} from '$lib/resource/content/resource-content-decoder';

import type {
	ResourceHandler
} from '$lib/resource/installation/resource-handler';

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

	async install(
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

		const contents =
			await this.resolver.resolve(
				representation
			);

		const resources:
			ResourceInstallOutcome[] =
				[];

		for (
			const content of contents
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

			return {
				reference,
				resourceType:
					content.resourceType,
				status:
					'handled'
			};
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
	}
}