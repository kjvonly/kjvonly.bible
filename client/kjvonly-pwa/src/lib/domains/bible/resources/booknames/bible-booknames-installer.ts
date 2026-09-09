import type {
	BibleBooknames
} from '$lib/domains/bible/models/bible-booknames.model';

import {
	createBibleBooknamesId
} from '$lib/domains/bible/models/bible-booknames.model';

import {
	BIBLE_BOOKNAMES_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-booknames-store';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource/installation/resource-installation';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	BibleBooknamesInstallationTransaction
} from './bible-booknames-installation-stores';

import type {
	ValidatedBibleBooknamesCandidate
} from './validated-bible-booknames-candidate';

export class BibleBooknamesInstaller {

	constructor(
		private readonly transaction:
			BibleBooknamesInstallationTransaction
	) { }

	async install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedBibleBooknamesCandidate[]
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
				'Bible Booknames Resource must produce exactly one candidate.'
			);
		}

		const [
			candidate
		] =
			candidates;

		await this.transaction.run(
			async (stores) => {
				const booknamesId =
					createBibleBooknamesId(
						resource.publisher,
						candidate.key
					);

				const existingInstallation =
					await stores
						.resourceInstallations
						.get(
							BIBLE_BOOKNAMES_OBJECT_TYPE,
							booknamesId
						);

				if (
					existingInstallation &&
					resource.modifiedAt <=
					existingInstallation.modifiedAt
				) {
					return;
				}

				const booknames:
					BibleBooknames = {
						...candidate.content,

						id:
							booknamesId
					};

				const installation:
					ResourceInstallation = {
						id:
							createResourceInstallationId(
								BIBLE_BOOKNAMES_OBJECT_TYPE,
								booknamesId
							),

						objectType:
							BIBLE_BOOKNAMES_OBJECT_TYPE,

						objectId:
							booknamesId,

						publisher:
							resource.publisher,

						resourceId:
							resource.resourceId,

						modifiedAt:
							resource.modifiedAt
					};

				await stores
					.booknames
					.put(
						booknames
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
