import {
	describe,
	expect,
	it
} from 'vitest';

import {
	NormalizedDocumentValidator
} from '$lib/domains/normalized-content';

const validator =
	new NormalizedDocumentValidator();

describe(
	'NormalizedDocumentValidator',
	() => {
		it(
			'accepts an empty document',
			() => {
				expect(
					validator.validate({
						blocks: []
					})
				).toEqual({
					blocks: []
				});
			}
		);

		it(
			'accepts inline content and optional word metadata',
			() => {
				const document =
					validator.validate({
						source:
							'poc/example.pdf',

						blocks: [
							{
								type:
									'paragraph',

								id:
									'p_1',

								class: [
									'text-center'
								],

								content: [
									{
										type:
											'word',

										text:
											'Genesis',

										class: [
											'color-dark-blue'
										],

										href: [
											'1_1_1'
										],

										emphasis:
											true,

										strong:
											true,

										marks: [
											'superscript'
										]
									},
									{
										type:
											'line-break'
									}
								]
							}
						]
					});

				expect(
					document.blocks[0]
				).toMatchObject({
					type:
						'paragraph',
					id:
						'p_1'
				});
			}
		);

		it.each([
			1,
			2,
			3,
			4,
			5,
			6
		])(
			'accepts heading level %i',
			(level: number) => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'heading',

									level,

									content: []
								}
							]
						})
			).not.toThrow();
		}
		);

		it.each([
			0,
			7,
			1.5
		])(
			'rejects invalid heading level %s',
			(level: number) => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'heading',

									level,

									content: []
								}
							]
						})
			).toThrow();
		}
		);

		it(
			'accepts recursive quotes and nested ordered and unordered lists',
			() => {
				const document =
					validator.validate({
						blocks: [
							{
								type:
									'quote',

								blocks: [
									{
										type:
											'text',

										content: [
											{
												type:
													'word',

												text:
													'Quoted'
											}
										]
									}
								]
							},
							{
								type:
									'list',

								ordered:
									true,

								blocks: [
									{
										type:
											'list-item',

										blocks: [
											{
												type:
													'paragraph',

												content: []
											},
											{
												type:
													'list',

												ordered:
													false,

												blocks: [
													{
														type:
															'list-item',

														blocks: []
													}
												]
											}
										]
									}
								]
							}
						]
					});

				expect(
					document.blocks
				).toHaveLength(
					2
				);
			}
		);

		it(
			'rejects a non-list-item child of a list',
			() => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'list',

									ordered:
										false,

									blocks: [
										{
											type:
												'paragraph',

											content: []
										}
									]
								}
							]
						})
			).toThrow();
			}
		);

		it(
			'rejects an unknown structural block type',
			() => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'table',

									blocks: []
								}
							]
						})
			).toThrow();
			}
		);

		it(
			'rejects an unknown inline type',
			() => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'paragraph',

									content: [
										{
											type:
												'raw-html',

											value:
												'<strong>no</strong>'
										}
									]
								}
							]
						})
			).toThrow();
			}
		);

		it.each([
			{
				name:
					'class',
				word: {
					type:
						'word',
					text:
						'Word',
					class: [
						123
					]
				}
			},
			{
				name:
					'href',
				word: {
					type:
						'word',
					text:
						'Word',
					href: [
						123
					]
				}
			},
			{
				name:
					'marks',
				word: {
					type:
						'word',
					text:
						'Word',
					marks: [
						123
					]
				}
			},
			{
				name:
					'strong',
				word: {
					type:
						'word',
					text:
						'Word',
					strong:
						'yes'
				}
			},
			{
				name:
					'emphasis',
				word: {
					type:
						'word',
					text:
						'Word',
					emphasis:
						'yes'
				}
			}
		])(
			'rejects invalid word $name metadata',
			({
				word
			}: {
				word: unknown;
			}) => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'paragraph',

									content: [
										word
									]
								}
							]
						})
			).toThrow();
			}
		);

		it(
			'rejects invalid block identifiers',
			() => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'paragraph',

									id:
										1,

									content: []
								}
							]
						})
			).toThrow();
			}
		);

		it(
			'rejects properties that are not allowed for the block type',
			() => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'paragraph',

									ordered:
										true,

									content: []
								}
							]
						})
			).toThrow();
			}
		);

		it(
			'removes legacy block.text while keeping inline word text authoritative',
			() => {
				const document =
					validator.validate({
						blocks: [
							{
								type:
									'paragraph',

								text:
									'Legacy duplicate',

								content: [
									{
										type:
											'word',

										text:
											'Canonical'
									}
								]
							}
						]
					});

				expect(
					document.blocks[0]
				).toEqual({
					type:
						'paragraph',
					content: [
						{
							type:
								'word',
							text:
								'Canonical'
						}
					]
				});
			}
		);

		it(
			'accepts unknown optional presentation hint values as strings',
			() => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'paragraph',

									class: [
										'future-publisher-hint'
									],

									content: [
										{
											type:
												'word',

											text:
												'Word',

											marks: [
												'future-mark'
											]
										}
									]
								}
							]
						})
			).not.toThrow();
			}
		);
	}
);
