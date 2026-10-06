import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceInstallation
} from './resource-installation';

import type {
	GenericResourceInstallationStores,
	GenericResourceInstallationTransaction
} from './generic-resource-installation-stores';

import {
	GenericResourceInstaller
} from './generic-resource-installer';

class FakeTransaction
	implements GenericResourceInstallationTransaction {

	readonly objects:
		StoredDomainObject[] = [];

	readonly installations:
		ResourceInstallation[] = [];

	readonly current =
		new Map<
			string,
			ResourceInstallation
		>();

	async run<TResult>(
		operation:
			(
				stores:
					GenericResourceInstallationStores
			) => Promise<TResult>
	): Promise<TResult> {
		return operation({
			domainObjects: {
				put:
					async (
						object
					) => {
						this.objects.push(
							object
						);
					}
			},

			resourceInstallations: {
				get:
					async (
						objectType,
						objectId
					) =>
						this.current.get(
							`${objectType}:${objectId}`
						),

				put:
					async (
						installation
					) => {
						this.installations.push(
							installation
						);
					}
			}
		});
	}
}

function createResource(
	overrides:
		Partial<DecodedResourceContent> = {}
): DecodedResourceContent {
	return {
		publisher:
			'publisher',

		resourceId:
			'documents/example',

		resourceType:
			'sermons',

		modifiedAt:
			100,

		mediaType:
			'application/json',

		dataType:
			'kjvonly.normalized-document',

		dataVersion:
			1,

		value: {
			raw:
				true
		},

		...overrides
	};
}

describe(
	'GenericResourceInstaller',
	() => {
		it(
			'validates semantic data then installs Domain objects created by the Resource Type factory',
			async () => {
				const validated = {
					accepted:
						true
				};

				const dataTypeHandler = {
					dataType:
						'kjvonly.normalized-document',

					dataVersion:
						1,

					validate:
						vi.fn(
							() =>
								validated
						)
				};

				const dataTypes = {
					resolve:
						vi.fn(
							() =>
								dataTypeHandler
						)
				};

				const candidates = [
					{
						objectType:
							'sermon',

						objectId:
							'publisher/example',

						dataType:
							'domain.sermon',

						dataVersion:
							3,

						value:
							validated
					},
					{
						objectType:
							'sermon/index',

						objectId:
							'publisher/example/index',

						dataType:
							'domain.sermon-index',

						dataVersion:
							2,

						value: {
							indexed:
								true
						}
					}
				];

				const factory = {
					resourceType:
						'sermons',

					create:
						vi.fn(
							() =>
								candidates
						)
				};

				const domainObjects = {
					resolve:
						vi.fn(
							() =>
								factory
						)
				};

				const transaction =
					new FakeTransaction();

				const installer =
					new GenericResourceInstaller(
						dataTypes,
						domainObjects,
						transaction
					);

				const resource =
					createResource();

				await installer.install(
					resource
				);

				expect(
					dataTypes.resolve
				).toHaveBeenCalledWith(
					resource.dataType,
					resource.dataVersion
				);

				expect(
					dataTypeHandler.validate
				).toHaveBeenCalledWith(
					resource.value
				);

				expect(
					domainObjects.resolve
				).toHaveBeenCalledWith(
					resource.resourceType
				);

				const {
					value: _rawValue,
					...resourceContext
				} = resource;

				expect(
					factory.create
				).toHaveBeenCalledWith(
					resourceContext,
					validated
				);

				expect(
					transaction.objects
				).toEqual([
					{
						id:
							'sermon:publisher/example',

						objectType:
							'sermon',

						objectId:
							'publisher/example',

						dataType:
							'domain.sermon',

						dataVersion:
							3,

						value:
							validated
					},
					{
						id:
							'sermon/index:publisher/example/index',

						objectType:
							'sermon/index',

						objectId:
							'publisher/example/index',

						dataType:
							'domain.sermon-index',

						dataVersion:
							2,

						value: {
							indexed:
								true
						}
					}
				]);

				expect(
					transaction.installations
				).toEqual([
					{
						id:
							'sermon:publisher/example',

						objectType:
							'sermon',

						objectId:
							'publisher/example',

						publisher:
							resource.publisher,

						resourceId:
							resource.resourceId,

						modifiedAt:
							resource.modifiedAt
					},
					{
						id:
							'sermon/index:publisher/example/index',

						objectType:
							'sermon/index',

						objectId:
							'publisher/example/index',

						publisher:
							resource.publisher,

						resourceId:
							resource.resourceId,

						modifiedAt:
							resource.modifiedAt
					}
				]);
			}
		);

		it(
			'applies currentness independently to every Domain object produced by the Resource',
			async () => {
				const transaction =
					new FakeTransaction();

				const resource =
					createResource();

				transaction.current.set(
					'sermon:publisher/current',
					{
						id:
							'sermon:publisher/current',

						objectType:
							'sermon',

						objectId:
							'publisher/current',

						publisher:
							resource.publisher,

						resourceId:
							resource.resourceId,

						modifiedAt:
							resource.modifiedAt
					}
				);

				const installer =
					new GenericResourceInstaller(
						{
							resolve:
								() => ({
									dataType:
										resource.dataType,

									dataVersion:
										resource.dataVersion,

									validate:
										(value) => value
								})
						},
						{
							resolve:
								() => ({
									resourceType:
										resource.resourceType,

									create:
										() => [
											{
												objectType:
													'sermon',

												objectId:
													'publisher/current',

												dataType:
													resource.dataType,

												dataVersion:
													resource.dataVersion,

												value:
													'old'
											},
											{
												objectType:
													'sermon',

												objectId:
													'publisher/new',

												dataType:
													resource.dataType,

												dataVersion:
													resource.dataVersion,

												value:
													'new'
											}
										]
								})
						},
						transaction
					);

				await installer.install(
					resource
				);

				expect(
					transaction.objects
				).toEqual([
					{
						id:
							'sermon:publisher/new',

						objectType:
							'sermon',

						objectId:
							'publisher/new',

						dataType:
							resource.dataType,

						dataVersion:
							resource.dataVersion,

						value:
							'new'
					}
				]);
			}
		);


		it(
			'preserves Resource metadata on ResourceInstallation provenance',
			async () => {
				const transaction =
					new FakeTransaction();

				const resource =
					createResource({
						metadata: {
							version:
								'King James Version'
						}
					});

				const installer =
					new GenericResourceInstaller(
						{
							resolve:
								() => ({
									dataType:
										resource.dataType,

									dataVersion:
										resource.dataVersion,

									validate:
										(value) => value
								})
						},
						{
							resolve:
								() => ({
									resourceType:
										resource.resourceType,

									create:
										() => [{
											objectType:
												'sermon',

											objectId:
												'publisher/example',

											dataType:
												resource.dataType,

											dataVersion:
												resource.dataVersion,

											value:
												resource.value
										}]
								})
						},
						transaction
					);

				await installer.install(
					resource
				);

				expect(
					transaction.installations[0]
				).toMatchObject({
					metadata: {
						version:
							'King James Version'
					}
				});
			}
		);
	}
);
