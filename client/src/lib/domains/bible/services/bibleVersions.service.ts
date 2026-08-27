import type {
	BibleVersion
} from '$lib/domains/bible/models/bible-version.model';

import type {
	BibleVersionCatalog
} from '$lib/domains/bible/persistence/bible-version-catalog';

export class BibleVersionsService {

	constructor(
		private readonly catalog:
			BibleVersionCatalog
	) {}

	async list(): Promise<
		readonly BibleVersion[]
	> {
		const versions =
			await this.catalog.list();

		return [...versions].sort(
			(a, b) =>
				a.id.localeCompare(
					b.version
				) ||
				a.publisher?.localeCompare(
					b.publisher
				)
		);
	}

	async resolve(
		selection:
			string |
			null |
			undefined
	): Promise<
		BibleVersion |
		undefined
	> {
		const versions =
			await this.list();

		if (!selection) {
			return versions[0];
		}

		const exact =
			versions.find(
				(version) =>
					version.id ===
					selection
			);

		if (exact) {
			return exact;
		}

		/*
		 * Temporary migration support for
		 * legacy values such as "kjvs".
		 *
		 * Only upgrade automatically when
		 * the value is unambiguous.
		 */
		const legacyMatches =
			versions.filter(
				(version) =>
					version.version ===
					selection
			);

		if (
			legacyMatches.length === 1
		) {
			return legacyMatches[0];
		}

		return undefined;
	}
}