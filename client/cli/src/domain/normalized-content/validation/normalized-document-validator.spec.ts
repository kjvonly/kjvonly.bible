import {
	describe,
	expect,
	it
} from 'vitest';

import {
	NormalizedDocumentValidator
} from './normalized-document-validator.js';

const validator =
	new NormalizedDocumentValidator();

describe(
	'NormalizedDocumentValidator',
	() => {
		it(
			'accepts an empty document and optional source provenance',
			() => {
				expect(
					validator.validate({
						source:
							'fixture/example.html',
						blocks: []
					})
				).toEqual({
					source:
						'fixture/example.html',
					blocks: []
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
									id:
										'heading-1',
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
									id:
										'heading-1',
									level,
									content: []
								}
							]
						})
				).toThrow();
			}
		);

		it(
			'rejects false joinPrevious values so absence remains the canonical spaced form',
			() => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'paragraph',
									id:
										'paragraph-1',
									content: [
										{
											type:
												'word',
											text:
												'Word',
											joinPrevious:
												false
										}
									]
								}
							]
						})
				).toThrow();
			}
		);

		it.each([
			'',
			'   ',
			'KJV Bible',
			'KJV\nBible'
		])(
			'rejects word text that is empty or contains canonical whitespace: %j',
			(text: string) => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type: 'paragraph',
									id: 'paragraph-1',
									content: [
										{
											type: 'word',
											text
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
				href: null
			},
			{
				href: []
			},
			{
				emphasis: false
			},
			{
				strong: false
			}
		])(
			'rejects non-sparse optional word semantics %#',
			(extra: Record<string, unknown>) => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type: 'paragraph',
									id: 'paragraph-1',
									content: [
										{
											type: 'word',
											text: 'KJV',
											...extra
										}
									]
								}
							]
						})
				).toThrow();
			}
		);

		it(
			'allows explicit empty href text while requiring a non-empty href collection',
			() => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type: 'paragraph',
									id: 'paragraph-1',
									content: [
										{
											type: 'word',
											text: 'KJV',
											href: [
												''
											]
										}
									]
								}
							]
						})
				).not.toThrow();
			}
		);

		it(
			'requires joinPrevious to follow a visible word in the same horizontal run',
			() => {
				for (
					const content of [
						[
							{
								type: 'word',
								text: 'KJV',
								joinPrevious: true
							}
						],
						[
							{
								type: 'anchor',
								id: 'fn1'
							},
							{
								type: 'word',
								text: 'KJV',
								joinPrevious: true
							}
						],
						[
							{
								type: 'word',
								text: 'KJV'
							},
							{
								type: 'line-break'
							},
							{
								type: 'anchor',
								id: 'fn1'
							},
							{
								type: 'word',
								text: 'Only',
								joinPrevious: true
							}
						]
					]
				) {
					expect(
						() =>
							validator.validate({
								blocks: [
									{
										type: 'paragraph',
										id: 'paragraph-1',
										content
									}
								]
							})
					).toThrow(
						'joinPrevious requires a preceding visible word without an intervening line break.'
					);
				}

				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type: 'paragraph',
									id: 'paragraph-1',
									content: [
										{
											type: 'word',
											text: 'K'
										},
										{
											type: 'anchor',
											id: 'kjv-anchor'
										},
										{
											type: 'word',
											text: 'JV',
											joinPrevious: true
										}
									]
								}
							]
						})
				).not.toThrow();
			}
		);

		it.each([
			'javascript:alert(1)',
			' JavaScript:alert(1)',
			'java\nscript:alert(1)',
			'vbscript:msgbox(1)',
			'data:text/html,<script>alert(1)</script>'
		])(
			'rejects unsafe executable normalized link target %s',
			(href: string) => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'paragraph',
									id:
										'paragraph-1',
									content: [
										{
											type:
												'word',
											text:
												'KJV',
											href: [
												href
											]
										}
									]
								}
							]
						})
				).toThrow(
					'Normalized link target uses an unsafe executable URI scheme.'
				);
			}
		);

		it(
			'accepts every v1 block shape recursively',
			() => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'paragraph',
									id:
										'p-1',
									class: [
										'text-center'
									],
									content: [
										{
											type:
												'word',
											text:
												'K'
										},
										{
											type:
												'word',
											text:
												'JV',
											joinPrevious:
												true,
											class: [
												'indent'
											],
											href: [
												'#note'
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
								},
								{
									type:
										'text',
									id:
										'text-1',
									content: []
								},
								{
									type:
										'preformatted',
									id:
										'preformatted-1',
									content: [
										{
											type:
												'line-break'
										}
									]
								},
								{
									type:
										'thematic-break',
									id:
										'thematic-break-1'
								},
								{
									type:
										'figure',
									id:
										'figure-1',
									blocks: [
										{
											type:
												'caption',
											id:
												'figure-caption-1',
											blocks: [
												{
													type:
														'text',
													id:
														'figure-caption-text-1',
													content: []
												}
											]
										}
									]
								},
								{
									type:
										'table',
									id:
										'table-1',
									blocks: [
										{
											type:
												'caption',
											id:
												'table-caption-1',
											blocks: [
												{
													type:
														'text',
													id:
														'table-caption-text-1',
													content: []
												}
											]
										},
										{
											type:
												'table-row',
											id:
												'table-row-1',
											blocks: [
												{
													type:
														'table-cell',
													id:
														'table-cell-1',
													header:
														true,
													blocks: []
												}
											]
										}
									]
								},
								{
									type:
										'quote',
									id:
										'quote-1',
									blocks: [
										{
											type:
												'paragraph',
											id:
												'quote-paragraph-1',
											content: []
										}
									]
								},
								{
									type:
										'list',
									id:
										'list-1',
									ordered:
										true,
									blocks: [
										{
											type:
												'list-item',
											id:
												'list-item-1',
											blocks: [
												{
													type:
														'text',
													id:
														'list-item-text-1',
													content: []
												}
											]
										}
									]
								}
							]
						})
				).not.toThrow();
			}
		);

		it(
			'requires non-blank document-wide unique canonical ids',
			() => {
				for (
					const id of [
						undefined,
						null,
						'',
						'   '
					]
				) {
					expect(
						() =>
							validator.validate({
								blocks: [
									{
										type:
											'paragraph',
										...(id !== undefined
											? {
												id
											}
											: {}),
										content: []
									}
								]
							})
					).toThrow();
				}

				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'quote',
									id:
										'shared-id',
									blocks: [
										{
											type:
												'paragraph',
											id:
												'shared-id',
											content: []
										}
									]
								}
							]
						})
				).toThrow(
					'Duplicate normalized id: shared-id'
				);
			}
		);

		it(
			'requires non-blank inline anchor ids and one shared block/anchor identity namespace',
			() => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type: 'paragraph',
									id: 'paragraph-1',
									content: [
										{
											type: 'anchor',
											id: '   '
										}
									]
								}
							]
						})
				).toThrow();

				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type: 'paragraph',
									id: 'fn1',
									content: [
										{
											type: 'anchor',
											id: 'fn1'
										}
									]
								}
							]
						})
				).toThrow(
					'Duplicate normalized id: fn1'
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
			'rejects invalid table hierarchy',
			() => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'table',
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

				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'table-row',
									blocks: [
										{
											type:
												'text',
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
			'rejects contextual blocks outside their owning structures',
			() => {
				for (
					const block of [
						{
							type:
								'list-item',
							blocks: []
						},
						{
							type:
								'caption',
							blocks: []
						},
						{
							type:
								'table-row',
							blocks: []
						},
						{
							type:
								'table-cell',
							header:
								false,
							blocks: []
						}
					]
				) {
					expect(
						() =>
							validator.validate({
								blocks: [
									block
								]
							})
					).toThrow();
				}

				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'quote',
									blocks: [
										{
											type:
												'caption',
											blocks: []
										}
									]
								}
							]
						})
			).toThrow();
		}
	);

		it(
			'rejects unknown block and inline types',
			() => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'unknown-block',
									blocks: []
								}
							]
						})
				).toThrow();

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
												'<b>no</b>'
										}
									]
								}
							]
						})
				).toThrow();
			}
		);

		it(
			'rejects invalid metadata and block-specific properties',
			() => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'paragraph',
									id:
										123,
									content: []
								}
							]
						})
				).toThrow();

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
												'word',
											text:
												'Text',
											strong:
												'yes'
										}
									]
								}
							]
						})
				).toThrow();
			}
		);

		it(
			'rejects retired duplicate block text',
			() => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'paragraph',
									id:
										'paragraph-retired-text',
									text:
										'KJV',
									content: [
										{
											type:
												'word',
											text:
												'KJV'
										}
									]
								}
							]
						})
				).toThrow();
			}
		);

		it(
			'accepts only canonical presentation classes and inline marks',
			() => {
				expect(
					() =>
						validator.validate({
							blocks: [
								{
									type:
										'paragraph',
									id:
										'presentation-valid',
									class: [
										'text-center',
										'indent'
									],
									content: [
										{
											type:
												'word',
											text:
												'KJV',
											marks: [
												'small',
												'code'
											]
										}
									]
								}
							]
						})
				).not.toThrow();

				for (
					const candidate of [
						{
							id:
								'unknown-class',
							class: [
								'future-class'
							],
							content: []
						},
						{
							id:
								'unknown-mark',
							content: [
								{
									type:
										'word',
									text:
										'KJV',
									marks: [
										'future-mark'
									]
								}
							]
						},
						{
							id:
								'empty-class',
							class: [],
							content: []
						},
						{
							id:
								'null-class',
							class:
								null,
							content: []
						},
						{
							id:
								'duplicate-class',
							class: [
								'indent',
								'indent'
							],
							content: []
						},
						{
							id:
								'empty-mark',
							content: [
								{
									type:
										'word',
									text:
										'KJV',
									marks: []
								}
							]
						},
						{
							id:
								'null-mark',
							content: [
								{
									type:
										'word',
									text:
										'KJV',
									marks:
										null
								}
							]
						},
						{
							id:
								'duplicate-mark',
							content: [
								{
									type:
										'word',
									text:
										'KJV',
									marks: [
										'code',
										'code'
									]
								}
							]
						}
					]
				) {
					expect(
						() =>
							validator.validate({
								blocks: [
									{
										type:
											'paragraph',
										...candidate
									}
								]
							})
					).toThrow();
				}
			}
		);

		it(
			'rejects unknown root properties and missing block arrays',
			() => {
				expect(
					() =>
						validator.validate({
							blocks: [],
							unknown:
								true
						})
				).toThrow();

				expect(
					() =>
						validator.validate({})
				).toThrow();
			}
		);
	}
);
