import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import type {
	ResourceInstallation
} from '$lib/resource';

import {
	matchesKJVOnlyArchiveExportSelection,
	type KJVOnlyArchiveExportSelection
} from './kjvonly-archive-export-selection';

import {
	KJVONLY_ARCHIVE_VERSION,
	type ArchivedDomainObject,
	type KJVOnlyArchiveV1
} from './kjvonly-archive';

import {
	KJVOnlyArchiveValidator
} from './kjvonly-archive-validator';

export class KJVOnlyArchiveExporter {
	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>,

		private readonly validator:
			KJVOnlyArchiveValidator =
			new KJVOnlyArchiveValidator()
	) {}

	async export(
		selection:
			KJVOnlyArchiveExportSelection
	): Promise<KJVOnlyArchiveV1> {
		const db =
			await this.getDB();

		const installations =
			await db.getAll(
				RESOURCE_INSTALLATIONS
			);

		const selected =
			installations.filter(
				(installation) =>
					matchesKJVOnlyArchiveExportSelection(
						installation,
						selection
					)
			);

		const domainObjects =
			await Promise.all(
				selected.map(
					(installation) =>
						db.get(
							DOMAIN_OBJECTS,
							installation.id
						)
				)
			);

		const archivedDomainObjects:
			Record<
				string,
				ArchivedDomainObject
			> = {};

		const archivedInstallations:
			Record<
				string,
				ResourceInstallation
			> = {};

		for (
			let index = 0;
			index < selected.length;
			index += 1
		) {
			const installation =
				selected[index];

			const domainObject =
				domainObjects[index];

			if (!domainObject) {
				throw new Error(
					`Cannot export Resource-backed Domain Object ${installation.id}: matching Domain Object is missing.`
				);
			}

			archivedDomainObjects[
				installation.id
			] = domainObject;

			archivedInstallations[
				installation.id
			] = installation;
		}

		return this.validator.validate({
			version:
				KJVONLY_ARCHIVE_VERSION,

			domain_objects:
				archivedDomainObjects,

			resource_installations:
				archivedInstallations
		});
	}
}
