import type {
	Chapter
} from '$lib/domains/bible/models/bible.model';

import type {
	BibleVersion
} from '$lib/domains/bible/models/bible-version.model';

import {
	createBibleVersionId,
	createChapterId
} from '$lib/domains/bible/utils/bible-identity';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource/installation/resource-installation';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	BibleChapterInstallationTransaction
} from './bible-chapter-installation-stores';

import type {
	ValidatedBibleChapterCandidate
} from './validated-bible-chapter-candidate';

export const BIBLE_CHAPTER_OBJECT_TYPE =
	'bible/chapter';

export class BibleChapterInstaller {

	constructor(
		private readonly transaction:
			BibleChapterInstallationTransaction
	) { }

	async install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedBibleChapterCandidate[]
	): Promise<void> {
		if (
			candidates.length ===
			0
		) {
			return;
		}

		const version =
			candidates[0].version;

		for (
			const candidate of candidates
		) {
			if (
				candidate.version !==
				version
			) {
				throw new Error(
					'Bible Chapter Resource contains multiple Bible versions.'
				);
			}
		}

		await this.transaction.run(
			async (stores) => {
				const bibleVersionId =
					createBibleVersionId(
						resource.publisher,
						version
					);

				const existingBibleVersion =
					await stores
						.bibleVersions
						.get(
							bibleVersionId
						);

				if (
					!existingBibleVersion
				) {
					const bibleVersion:
						BibleVersion = {
						id:
							bibleVersionId,

						publisher:
							resource.publisher,

						version
					};

					await stores
						.bibleVersions
						.put(
							bibleVersion
						);
				}

				for (
					const candidate of candidates
				) {
					const chapterId =
						createChapterId(
							bibleVersionId,
							candidate.chapterRef
						);

					const existingInstallation =
						await stores
							.resourceInstallations
							.get(
								BIBLE_CHAPTER_OBJECT_TYPE,
								chapterId
							);

					if (
						existingInstallation &&
						resource.modifiedAt <=
						existingInstallation.modifiedAt
					) {
						continue;
					}

					const chapter:
						Chapter = {
						...candidate.content,

						id:
							chapterId
					};

					const installation:
						ResourceInstallation = {
						id:
							createResourceInstallationId(
								BIBLE_CHAPTER_OBJECT_TYPE,
								chapterId
							),

						objectType:
							BIBLE_CHAPTER_OBJECT_TYPE,

						objectId:
							chapterId,

						publisher:
							resource.publisher,

						resourceId:
							resource.resourceId,

						modifiedAt:
							resource.modifiedAt
					};

					await stores
						.chapters
						.put(
							chapter
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