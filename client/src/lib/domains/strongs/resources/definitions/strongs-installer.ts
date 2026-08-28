import type {
	Strongs
} from '$lib/domains/strongs/models/strongs.model';

import {
	STRONGS_DEFINITION_OBJECT_TYPE
} from '$lib/domains/strongs/persistence/strongs-store';

import {
	createBibleVersionId
} from '$lib/domains/bible/utils/bible-identity';

import {
	createStrongsId
} from '$lib/domains/strongs/utils/strongs-identity';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource/installation/resource-installation';

import type {
	StrongsInstallationTransaction
} from './strongs-installation-stores';

import type {
	ValidatedStrongsCandidate
} from './validated-strongs-candidate';

export class StrongsInstaller {

	constructor(
		private readonly transaction:
			StrongsInstallationTransaction
	) {}

	async install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedStrongsCandidate[]
	): Promise<void> {

		if (
			candidates.length ===
			0
		) {
			return;
		}

		const versions =
			new Set(
				candidates.map(
					(candidate) =>
						candidate.version
				)
			);

		if (
			versions.size !==
			1
		) {
			throw new Error(
				"Strong's Resource contains multiple Bible versions."
			);
		}

		const version =
			candidates[0]
				.version;

		const bibleVersionId =
			createBibleVersionId(
				resource.publisher,
				version
			);

		await this.transaction.run(
			async (stores) => {
				for (
					const candidate
					of candidates
				) {
					const strongsId =
						createStrongsId(
							bibleVersionId,
							candidate.key
						);

					const currentInstallation =
						await stores
							.resourceInstallations
							.get(
								STRONGS_DEFINITION_OBJECT_TYPE,
								strongsId
							);

					if (
						currentInstallation &&
						resource.modifiedAt <=
							currentInstallation.modifiedAt
					) {
						continue;
					}

					const strongs:
						Strongs = {
							...candidate.content,

							id:
								strongsId
						};

					const installation:
						ResourceInstallation = {
							id:
								createResourceInstallationId(
									STRONGS_DEFINITION_OBJECT_TYPE,
									strongsId
								),

							objectType:
								STRONGS_DEFINITION_OBJECT_TYPE,

							objectId:
								strongsId,

							publisher:
								resource.publisher,

							resourceId:
								resource.resourceId,

							eventId:
								resource.eventId,

							modifiedAt:
								resource.modifiedAt
						};

					await stores
						.strongs
						.put(
							strongs
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