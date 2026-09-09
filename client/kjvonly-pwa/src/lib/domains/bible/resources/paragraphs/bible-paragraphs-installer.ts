import type {
	BibleParagraphs
} from '$lib/domains/bible/models/bible-paragraphs.model';

import {
	createBibleParagraphsId
} from '$lib/domains/bible/models/bible-paragraphs.model';

import {
	BIBLE_PARAGRAPHS_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-paragraphs-store';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource/installation/resource-installation';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	BibleParagraphsInstallationTransaction
} from './bible-paragraphs-installation-stores';

import type {
	ValidatedBibleParagraphsCandidate
} from './validated-bible-paragraphs-candidate';

export class BibleParagraphsInstaller {

	constructor(
		private readonly transaction:
			BibleParagraphsInstallationTransaction
	) { }

	async install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedBibleParagraphsCandidate[]
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
					'Bible Paragraphs Resource contains multiple sources.'
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
					const paragraphsId =
						createBibleParagraphsId(
							resource.publisher,
							source,
							candidate.chapterRef
						);

					const existingInstallation =
						await stores
							.resourceInstallations
							.get(
								BIBLE_PARAGRAPHS_OBJECT_TYPE,
								paragraphsId
							);

					if (
						existingInstallation &&
						resource.modifiedAt <=
							existingInstallation.modifiedAt
					) {
						continue;
					}

					const paragraphs:
						BibleParagraphs = {
							id:
								paragraphsId,

							chapterRef:
								candidate.chapterRef,

							paragraphs:
								candidate.paragraphs
						};

					const installation:
						ResourceInstallation = {
							id:
								createResourceInstallationId(
									BIBLE_PARAGRAPHS_OBJECT_TYPE,
									paragraphsId
								),

							objectType:
								BIBLE_PARAGRAPHS_OBJECT_TYPE,

							objectId:
								paragraphsId,

							publisher:
								resource.publisher,

							resourceId:
								resource.resourceId,

							modifiedAt:
								resource.modifiedAt
						};

					await stores
						.paragraphs
						.put(
							paragraphs
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
