import type {
	BiblePericopes
} from '$lib/domains/bible/models/bible-pericopes.model';

import {
	createBiblePericopesId
} from '$lib/domains/bible/models/bible-pericopes.model';

import {
	BIBLE_PERICOPES_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-pericopes-store';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource/installation/resource-installation';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	BiblePericopesInstallationTransaction
} from './bible-pericopes-installation-stores';

import type {
	ValidatedBiblePericopesCandidate
} from './validated-bible-pericopes-candidate';

export class BiblePericopesInstaller {

	constructor(
		private readonly transaction:
			BiblePericopesInstallationTransaction
	) { }

	async install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedBiblePericopesCandidate[]
	): Promise<void> {
		if (
			candidates.length ===
			0
		) {
			return;
		}

		const source =
			candidates[0].source;

		for (
			const candidate of candidates
		) {
			if (
				candidate.source !==
				source
			) {
				throw new Error(
					'Bible Pericopes Resource contains multiple sources.'
				);
			}
		}

		await this.transaction.run(
			async (
				stores
			) => {
				for (
					const candidate of candidates
				) {
					const pericopesId =
						createBiblePericopesId(
							resource.publisher,
							source,
							candidate.chapterRef
						);

					const existingInstallation =
						await stores
							.resourceInstallations
							.get(
								BIBLE_PERICOPES_OBJECT_TYPE,
								pericopesId
							);

					if (
						existingInstallation &&
						resource.modifiedAt <=
							existingInstallation.modifiedAt
					) {
						continue;
					}

					const pericopes:
						BiblePericopes = {
							id:
								pericopesId,

							chapterRef:
								candidate.chapterRef,

							pericopes:
								candidate.pericopes
						};

					const installation:
						ResourceInstallation = {
							id:
								createResourceInstallationId(
									BIBLE_PERICOPES_OBJECT_TYPE,
									pericopesId
								),

							objectType:
								BIBLE_PERICOPES_OBJECT_TYPE,

							objectId:
								pericopesId,

							publisher:
								resource.publisher,

							resourceId:
								resource.resourceId,

							modifiedAt:
								resource.modifiedAt
						};

					await stores
						.pericopes
						.put(
							pericopes
						);

					await stores
						.resourceInstallations
						.put(
							installation
						);
				}
			}
		);
	}
}
