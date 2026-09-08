import {
	describe,
	expect,
	it
} from 'vitest';

import {
	BlossomDescriptorStrategyBuilder
} from './blossom-descriptor-strategy-builder.js';


describe(
	'BlossomDescriptorStrategyBuilder',
	() => {

		it(
			'builds multi-mirror Blossom strategy data',
			() => {

				const sha256 =
					'a'.repeat(
						64
					);


				const builder =
					new BlossomDescriptorStrategyBuilder();


				const strategy =
					builder.build(
						{
							type:
								'blossom',

							urls: [
								'https://a.example',
								'https://b.example/'
							]
						},
						{
							path:
								'/stage/artifact',

							kind:
								'file',

							size:
								123,

							metadata: {
								key:
									'bundle',

								sourceMtimeMs:
									100,

								sourceSize:
									100,

								artifactRevision:
									'12345678',

								sha256,

								extension:
									'.json.gz'
							}
						}
					);


				expect(
					strategy
				).toEqual({
					type:
						'blossom',

					data: {
						urls: [
							`https://a.example/${sha256}`,
							`https://b.example/${sha256}`
						],

						sha256,

						size:
							123
					}
				});
			}
		);
	}
);