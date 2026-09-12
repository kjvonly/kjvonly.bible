import type {
	BibleSearchIndex
} from '$lib/domains/bible/models/bible-search-index.model';

import {
	createBibleSearchIndexId
} from '$lib/domains/bible/models/bible-search-index.model';

import {
	BIBLE_SEARCH_INDEX_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-search-index-store';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource/installation/resource-installation';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	BibleSearchIndexInstallationTransaction
} from './bible-search-index-installation-stores';

import type {
	ValidatedBibleSearchIndexCandidate
} from './validated-bible-search-index-candidate';

export class BibleSearchIndexInstaller {

	constructor(
		private readonly transaction:
			BibleSearchIndexInstallationTransaction
	) { }

	async install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedBibleSearchIndexCandidate[]
	): Promise<void> {
		if (
			candidates.length ===
			0
		) {
			return;
		}

		if (
			candidates.length !==
			1
		) {
			throw new Error(
				'Bible Search Index Resource must produce exactly one candidate.'
			);
		}

		const [
			candidate
		] =
			candidates;

		await this.transaction.run(
			async (stores) => {
				const searchIndexId =
					createBibleSearchIndexId(
						resource.publisher,
						candidate.version
					);

				const existingInstallation =
					await stores
						.resourceInstallations
						.get(
							BIBLE_SEARCH_INDEX_OBJECT_TYPE,
							searchIndexId
						);

				if (
					existingInstallation &&
					resource.modifiedAt <=
					existingInstallation.modifiedAt
				) {
					return;
				}

				const searchIndex:
					BibleSearchIndex = {
						id:
							searchIndexId,

						version:
							candidate.version,

						chunks:
							candidate.chunks
					};

				const installation:
					ResourceInstallation = {
						id:
							createResourceInstallationId(
								BIBLE_SEARCH_INDEX_OBJECT_TYPE,
								searchIndexId
							),

						objectType:
							BIBLE_SEARCH_INDEX_OBJECT_TYPE,

						objectId:
							searchIndexId,

						publisher:
							resource.publisher,

						resourceId:
							resource.resourceId,

						modifiedAt:
							resource.modifiedAt
					};

				await stores
					.searchIndexes
					.put(
						searchIndex
					);

				await stores
					.resourceInstallations
					.put(
						installation
					);
			}
		);
	}
}
