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
											'kjvonly/bible/chapters/kjvs'
										],
										[
											't',
											'kjvonly/bible/chapters'
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
						'kjvonly/bible/chapters/kjvs',

					category:
						'kjvonly/bible/chapters',

					modifiedAt:
						1000,

					mediaType:
						'application/json+gzip'
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
												'category'
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
	}
);