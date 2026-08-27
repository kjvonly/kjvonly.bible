import type {
	PublishedResourceReference
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
	BibleChapterResourceHandler
} from './bible-chapter-resource-handler';

export class BibleChapterResourceService {

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

		private readonly handler:
			Pick<
				BibleChapterResourceHandler,
				'handle'
			>
	) {}

	async install(
		reference:
			PublishedResourceReference
	): Promise<boolean> {
		const representation =
			await this.discovery.get(
				reference
			);

		if (
			representation === null
		) {
			return false;
		}

		const contents =
			await this.resolver.resolve(
				representation
			);

		for (
			const content of contents
		) {
			const decoded =
				await this.decoder.decode(
					content
				);

			await this.handler.handle(
				decoded
			);
		}

		return true;
	}
}