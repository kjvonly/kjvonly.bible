import {
	createStoredDomainObjectId,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceDataTypeResolver
} from '$lib/resource/data-types/resource-data-type-resolver';

import type {
	ResourceDomainObjectFactoryResolver
} from '$lib/resource/domain-objects/resource-domain-object-factory-resolver';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from './resource-installation';

import type {
	GenericResourceInstallationTransaction
} from './generic-resource-installation-stores';

/**
 * Installs decoded Resources through the generic semantic-data lifecycle.
 *
 * The datatype handler owns semantic payload validation. The Domain-object
 * factory owns application identity and may produce zero, one, or many objects
 * from the accepted value. This installer owns only currentness, persistence,
 * and Resource installation receipts.
 */
export class GenericResourceInstaller {
	constructor(
		private readonly dataTypes:
			Pick<
				ResourceDataTypeResolver,
				'resolve'
			>,

		private readonly domainObjects:
			Pick<
				ResourceDomainObjectFactoryResolver,
				'resolve'
			>,

		private readonly transaction:
			GenericResourceInstallationTransaction
	) {}

	async install(
		resource:
			DecodedResourceContent
	): Promise<void> {
		const dataType =
			resource.dataType;

		const dataVersion =
			resource.dataVersion;

		const dataTypeHandler =
			this.dataTypes.resolve(
				dataType,
				dataVersion
			);

		const value =
			dataTypeHandler.validate(
				resource.value
			);

		const factory =
			this.domainObjects.resolve(
				resource.resourceType
			);

		const {
			value: _rawValue,
			...resourceContext
		} = resource;

		const candidates =
			factory.create(
				resourceContext,
				value
			);

		await this.transaction.run(
			async (
				stores
			) => {
				for (
					const candidate of candidates
				) {
					const currentInstallation =
						await stores
							.resourceInstallations
							.get(
								candidate.objectType,
								candidate.objectId
							);

					if (
						currentInstallation !== undefined &&
						resource.modifiedAt <=
							currentInstallation.modifiedAt
					) {
						continue;
					}

					const object:
						StoredDomainObject = {
							id:
								createStoredDomainObjectId(
									candidate.objectType,
									candidate.objectId
								),

							objectType:
								candidate.objectType,

							objectId:
								candidate.objectId,

							dataType:
								candidate.dataType,

							dataVersion:
								candidate.dataVersion,

							value:
								candidate.value
						};

					const installation:
						ResourceInstallation = {
							id:
								createResourceInstallationId(
									candidate.objectType,
									candidate.objectId
								),

							objectType:
								candidate.objectType,

							objectId:
								candidate.objectId,

							publisher:
								resource.publisher,

							resourceId:
								resource.resourceId,

							...(resource.metadata === undefined
								? {}
								: { metadata: resource.metadata }),

							modifiedAt:
								resource.modifiedAt
						};

					await stores.domainObjects.put(
						object
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
