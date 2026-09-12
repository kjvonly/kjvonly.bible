import type {
	BibleTextMarkup
} from '$lib/domains/bible/models/bible-text-markup.model';

import {
	createBibleTextMarkupId
} from '$lib/domains/bible/models/bible-text-markup.model';

import {
	BIBLE_TEXT_MARKUP_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-text-markup-store';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource/installation/resource-installation';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	BibleTextMarkupInstallationTransaction
} from './bible-text-markup-installation-stores';

import type {
	ValidatedBibleTextMarkupCandidate
} from './validated-bible-text-markup-candidate';

export class BibleTextMarkupInstaller {

	constructor(
		private readonly transaction:
			BibleTextMarkupInstallationTransaction
	) { }

	async install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedBibleTextMarkupCandidate[]
	): Promise<void> {
		if (
			candidates.length ===
			0
		) {
			return;
		}

		const name =
			candidates[0].name;

		for (
			const candidate of candidates
		) {
			if (
				candidate.name !==
				name
			) {
				throw new Error(
					'Bible Text Markup Resource contains multiple names.'
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
					const textMarkupId =
						createBibleTextMarkupId(
							resource.publisher,
							name,
							candidate.chapterRef
						);

					const existing =
						await stores
							.textMarkup
							.get(
								textMarkupId
							);

					if (existing) {
						continue;
					}

					const textMarkup:
						BibleTextMarkup = {
							id:
								textMarkupId,

							chapterRef:
								candidate.chapterRef,

							markings:
								candidate.markings
						};

					const installation:
						ResourceInstallation = {
							id:
								createResourceInstallationId(
									BIBLE_TEXT_MARKUP_OBJECT_TYPE,
									textMarkupId
								),

							objectType:
								BIBLE_TEXT_MARKUP_OBJECT_TYPE,

							objectId:
								textMarkupId,

							publisher:
								resource.publisher,

							resourceId:
								resource.resourceId,

							modifiedAt:
								resource.modifiedAt
						};

					await stores
						.textMarkup
						.put(
							textMarkup
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
