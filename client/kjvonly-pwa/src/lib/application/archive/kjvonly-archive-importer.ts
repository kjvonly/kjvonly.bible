import {
	RESOURCE_INSTALLATIONS,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import type {
	DecodedResourceContent,
	ResourceInstallOutcome,
	ResourceProcessor,
	ResourcePublicationResolver
} from '$lib/resource';

import {
	KJVOnlyArchiveCodec
} from './kjvonly-archive-codec';

export type KJVOnlyArchiveImportStatus =
	| 'current'
	| 'handled'
	| 'unsupported'
	| 'failed';

export interface KJVOnlyArchiveImportOutcome {
	readonly id:
		string;

	readonly status:
		KJVOnlyArchiveImportStatus;

	readonly resourceType?:
		string;

	readonly resourceId?:
		string;

	readonly error?:
		unknown;
}

export interface KJVOnlyArchiveImportResult {
	readonly resources:
		readonly KJVOnlyArchiveImportOutcome[];
}

type ArchiveImportDB =
	Pick<
		ApplicationDB,
		'get'
	>;

export class KJVOnlyArchiveImporter {
	constructor(
		private readonly getDB:
			() => Promise<ArchiveImportDB>,

		private readonly publications:
			Pick<
				ResourcePublicationResolver,
				'resolve'
			>,

		private readonly processor:
			Pick<
				ResourceProcessor,
				'processDecoded'
			>,

		private readonly codec:
			Pick<
				KJVOnlyArchiveCodec,
				'decode'
			> =
				new KJVOnlyArchiveCodec()
	) {}

	async import(
		value: Uint8Array
	): Promise<KJVOnlyArchiveImportResult> {
		const archive =
			await this.codec.decode(
				value
			);

		const db =
			await this.getDB();

		const resources:
			KJVOnlyArchiveImportOutcome[] =
				[];

		for (
			const [
				id,
				installation
			] of Object.entries(
				archive.resource_installations
			)
		) {
			const current =
				await db.get(
					RESOURCE_INSTALLATIONS,
					id
				);

			if (
				current &&
				installation.modifiedAt <=
					current.modifiedAt
			) {
				resources.push({
					id,
					status:
						'current',
					resourceId:
						installation.resourceId
				});

				continue;
			}

			const domainObject =
				archive.domain_objects[
					id
				];

			try {
				const publication =
					this.publications.resolve(
						domainObject.objectType,
						domainObject.objectId,
						domainObject.value
					);

				if (!publication) {
					resources.push({
						id,
						status:
							'unsupported'
					});

					continue;
				}

				if (
					publication.publisher !==
						installation.publisher
				) {
					throw new Error(
						`Archived Resource publisher does not match Resource Installation for ${id}.`
					);
				}

				const decoded:
					DecodedResourceContent = {
						publisher:
							publication.publisher,

						resourceId:
							publication.resourceId,

						resourceType:
							publication.resourceType,

						modifiedAt:
							installation.modifiedAt,

						mediaType:
							publication.mediaType,

						value:
							publication.value
					};

				const outcome =
					await this.processor
						.processDecoded(
							decoded
						);

				resources.push(
					mapOutcome(
						id,
						outcome
					)
				);
			} catch (error) {
				resources.push({
					id,
					status:
						'failed',
					error
				});
			}
		}

		return {
			resources
		};
	}
}

function mapOutcome(
	id: string,
	outcome:
		ResourceInstallOutcome
): KJVOnlyArchiveImportOutcome {
	return {
		id,
		status:
			outcome.status,
		resourceType:
			outcome.resourceType,
		resourceId:
			outcome.reference
				?.resourceId,
		...(
			outcome.status ===
				'failed'
				? {
						error:
							outcome.error
					}
				: {}
		)
	};
}
