import type {
	BibleVersion
} from '$lib/domains/bible/models/bible-version.model';

import type {
	BibleVersionCatalog
} from '$lib/domains/bible/persistence/bible-version-catalog';

import {
	parseBibleVersionId
} from '$lib/domains/bible/utils/bible-identity';

export class BibleVersionsService {

	constructor(
		private readonly catalog:
			BibleVersionCatalog,

		private readonly defaultBibleVersion:
			BibleVersion
	) {}

	async list(): Promise<
		readonly BibleVersion[]
	> {
		const versions =
			await this.catalog.list();

		return [...versions].sort(
			(a, b) =>
				a.version.localeCompare(
					b.version
				) ||
				a.publisher.localeCompare(
					b.publisher
				)
		);
	}

	async resolve(
		selection:
			string |
			null |
			undefined
	): Promise<BibleVersion> {

		const versions =
			await this.list();

		if (selection) {
			const exact =
				versions.find(
					(version) =>
						version.id ===
						selection
				);

			if (exact) {
				return exact;
			}

			try {
				const identity =
					parseBibleVersionId(
						selection
					);

				return {
					id:
						selection,

					publisher:
						identity.publisher,

					version:
						identity.version
				};
			} catch {
				/*
				 * Invalid / legacy selections are
				 * discarded rather than propagated.
				 */
			}
		}

		return (
			versions[0] ??
			this.defaultBibleVersion
		);
	}
}