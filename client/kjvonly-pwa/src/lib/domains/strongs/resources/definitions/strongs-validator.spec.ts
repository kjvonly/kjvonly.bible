import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	StrongsCandidate
} from './strongs-candidate';

import {
	StrongsValidator
} from './strongs-validator';

describe(
	'StrongsValidator',
	() => {
		it(
			'validates a Greek Strong\'s definition',
			() => {
				const validator =
					new StrongsValidator();

				const result =
					validator.validate(
						createCandidate()
					);

				expect(
					result
				).toEqual({
					version:
						'kjvs',

					key:
						'G1',

					content:
						createContent()
				});
			}
		);

		it(
			'validates a Hebrew Strong\'s definition',
			() => {
				const validator =
					new StrongsValidator();

				const content =
					createContent({
						number:
							'H1'
					});

				const result =
					validator.validate(
						createCandidate({
							key:
								'H1',

							value:
								content
						})
					);

				expect(
					result.key
				).toBe(
					'H1'
				);

				expect(
					result.content
				).toEqual(
					content
				);
			}
		);

		it(
			'preserves the Bible version',
			() => {
				const validator =
					new StrongsValidator();

				const result =
					validator.validate(
						createCandidate({
							version:
								'kjv'
						})
					);

				expect(
					result.version
				).toBe(
					'kjv'
				);
			}
		);

		it(
			'accepts a null Brown definition',
			() => {
				const validator =
					new StrongsValidator();

				const result =
					validator.validate(
						createCandidate({
							value:
								createContent({
									brownDef:
										null
								})
						})
					);

				expect(
					result.content
						.brownDef
				).toBeNull();
			}
		);

		it(
			'accepts a null Thayer\'s definition',
			() => {
				const validator =
					new StrongsValidator();

				const result =
					validator.validate(
						createCandidate({
							value:
								createContent({
									thayersDef:
										null
								})
						})
					);

				expect(
					result.content
						.thayersDef
				).toBeNull();
			}
		);

		it(
			'accepts null children on a definition node',
			() => {
				const validator =
					new StrongsValidator();

				const result =
					validator.validate(
						createCandidate({
							value:
								createContent({
									thayersDef: {
										text:
											'definition',

										children:
											null
									}
								})
						})
					);

				expect(
					result.content
						.thayersDef
				).toEqual({
					text:
						'definition',

					children:
						null
				});
			}
		);

		it(
			'accepts recursively nested definition nodes',
			() => {
				const validator =
					new StrongsValidator();

				const result =
					validator.validate(
						createCandidate({
							value:
								createContent({
									thayersDef: {
										text:
											'root',

										children: [
											{
												text:
													'child',

												children: [
													{
														text:
															'leaf',

														children:
															null
													}
												]
											}
										]
									}
								})
						})
					);

				expect(
					result.content
						.thayersDef
						?.children?.[0]
						.children?.[0]
						.text
				).toBe(
					'leaf'
				);
			}
		);

		it(
			'rejects an invalid Strong\'s key',
			() => {
				const validator =
					new StrongsValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								key:
									'INVALID'
							})
						)
				).toThrow(
					'Invalid Strong\'s key'
				);
			}
		);

		it(
			'rejects a lowercase Strong\'s key',
			() => {
				const validator =
					new StrongsValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								key:
									'g1'
							})
						)
				).toThrow(
					'Invalid Strong\'s key'
				);
			}
		);

		it(
			'rejects a Strong\'s key without a number',
			() => {
				const validator =
					new StrongsValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								key:
									'G'
							})
						)
				).toThrow(
					'Invalid Strong\'s key'
				);
			}
		);

		it(
			'rejects content whose number does not match the candidate key',
			() => {
				const validator =
					new StrongsValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value:
									createContent({
										number:
											'G2'
									})
							})
						)
				).toThrow(
					'does not match content number'
				);
			}
		);

		it(
			'rejects non-object Strong\'s content',
			() => {
				const validator =
					new StrongsValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value:
									'not-an-object'
							})
						)
				).toThrow();
			}
		);

		it(
			'rejects content missing required fields',
			() => {
				const validator =
					new StrongsValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									number:
										'G1'
								}
							})
						)
				).toThrow();
			}
		);

		it(
			'rejects invalid usage entries',
			() => {
				const validator =
					new StrongsValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value:
									createContent({
										usageByBook: [
											{
												text:
													'Genesis',

												href:
													'not-an-array',

												class:
													[]
											}
										]
									})
							})
						)
				).toThrow();
			}
		);

		it(
			'rejects invalid definition children',
			() => {
				const validator =
					new StrongsValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value:
									createContent({
										thayersDef: {
											text:
												'definition',

											children:
												'invalid'
										}
									})
							})
						)
				).toThrow();
			}
		);

		it(
			'does not retain unsupported serialized fields',
			() => {
				const validator =
					new StrongsValidator();

				const result =
					validator.validate(
						createCandidate({
							value: {
								...createContent(),

								unsupported:
									'value'
							}
						})
					);

				expect(
					result.content
				).not.toHaveProperty(
					'unsupported'
				);
			}
		);
	}
);

function createCandidate(
	overrides:
		Partial<StrongsCandidate> =
			{}
): StrongsCandidate {

	return {
		version:
			'kjvs',

		key:
			'G1',

		value:
			createContent(),

		...overrides
	};
}

function createContent(
	overrides:
		Record<string, unknown> =
			{}
) {
	return {
		number:
			'G1',

		originalWord:
			'Α',

		partsOfSpeech:
			'noun',

		phoneticSpelling:
			'alpha',

		transliteratedWord:
			'A',

		usageByBook: [
			{
				text:
					'Matthew',

				href: [
					'40'
				],

				class: [
					'book'
				]
			}
		],

		usageByWord: [
			{
				text:
					'word',

				href: [
					'G1'
				],

				class: [
					'word'
				]
			}
		],

		brownDef:
			null,

		strongsDef:
			'Strong\'s definition',

		thayersDef: {
			text:
				'Thayer\'s definition',

			children: [
				{
					text:
						'child definition',

					children:
						null
				}
			]
		},

		...overrides
	};
}