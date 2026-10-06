import {
	describe,
	expect,
	it
} from 'vitest';

import {
	ResourceDescriptorBuilder
} from './resource-descriptor-builder.js';


describe(
	'ResourceDescriptorBuilder',
	() => {

		it(
			'derives descriptor metadata from concrete publication data',
			() => {

				const descriptor =
					new ResourceDescriptorBuilder()
						.build({
							source: {
								resourceName:
									'bundle',

								key:
									'kjvs',

								path:
									'/data/kjvs.json.gz',

								event: {
									encoding: [
										'hex'
									],

									tags: [
										[
											'd',
											'kjvonly/bible/chapter/kjvs'
										],
										[
											't',
											'bible/chapter'
										],
										[
											'dataType',
											'kjvonly.bible.chapter'
										],
										[
											'dataVersion',
											'1'
										],
										[
											'version',
											'kjvs'
										],
										[
											'language',
											'en'
										]
									]
								},

								objectUpload: {
									mediaType:
										'application/json+gzip',

									encoding:
										[]
								}
							},

							artifact: {
								path:
									'/artifact',

								kind:
									'symlink',

								size:
									100,

								metadata: {
									key:
										'kjvs',

									sourceMtimeMs:
										1,

									sourceSize:
										100,

									artifactRevision:
										'12345678',

									sha256:
										'a'.repeat(
											64
										),

									extension:
										'.json.gz'
								}
							},

							publisher:
								'b'.repeat(
									64
								),

							modifiedAt:
								1000,

							strategy: {
								type:
									'blossom',

								data: {}
							}
						});


				expect(
					descriptor.metadata
				).toEqual({
					publisher:
						'b'.repeat(
							64
						),

					resourceId:
						'kjvonly/bible/chapter/kjvs',

					resourceType:
						'bible/chapter',

					dataType:
						'kjvonly.bible.chapter',

					dataVersion:
						1,

					modifiedAt:
						1000,

					representation:
						'content',

					mediaType:
						'application/json+gzip'
				});


			expect(
				descriptor.resourceMetadata
			).toEqual({
				version:
					'kjvs',

				language:
					'en'
			});
			}
		);


		it(
			'rejects ambiguous descriptor identity',
			() => {

				expect(
					() =>
						new ResourceDescriptorBuilder()
							.build({
								source: {
									resourceName:
										'bundle',

									key:
										'kjvs',

									path:
										'/data',

									event: {
										encoding:
											[],

										tags: [
											[
												'd',
												'one'
											],
											[
												'd',
												'two'
											],
											[
												't',
												'resourceType'
											]
										]
									},

									objectUpload: {
										mediaType:
											'application/json',

										encoding:
											[]
									}
								},

								artifact: {
									path:
										'/artifact',

									kind:
										'file',

									size:
										1,

									metadata: {
										key:
											'kjvs',

										sourceMtimeMs:
											1,

										sourceSize:
											1,

										artifactRevision:
											'12345678',

										sha256:
											'a'.repeat(
												64
											),

										extension:
											''
									}
								},

								publisher:
									'b'.repeat(
										64
									),

								modifiedAt:
									100,

								strategy: {
									type:
										'blossom',

									data: {}
								}
							})
				).toThrow(
					'requires exactly one "d" tag'
				);
			}
		);

		it(
			'rejects an invalid descriptor data version',
			() => {

				expect(
					() =>
						new ResourceDescriptorBuilder()
							.build({
								source: {
									resourceName:
										'bundle',

									key:
										'kjvs',

									path:
										'/data',

									event: {
										encoding:
											[],

										tags: [
											['d', 'resource'],
											['t', 'resourceType'],
											['dataType', 'contract'],
											['dataVersion', '0']
										]
									},

									objectUpload: {
										mediaType:
											'application/json',

										encoding:
											[]
									}
								},

								artifact: {
									path:
										'/artifact',

									kind:
										'file',

									size:
										1,

									metadata: {
										key:
											'kjvs',

										sourceMtimeMs:
											1,

										sourceSize:
											1,

										artifactRevision:
											'12345678',

										sha256:
											'a'.repeat(64),

										extension:
											''
									}
								},

								publisher:
									'b'.repeat(64),

								modifiedAt:
									100,

								strategy: {
									type:
										'blossom',

									data:
										{}
								}
							})
				).toThrow(
					'has an invalid "dataVersion" tag'
				);
			}
		);

	}
);