import {
	describe,
	expect,
	it
} from 'vitest';

import {
	Modules
} from '$lib/application/models/modules.model';

import {
	Buffer
} from '$lib/application/runtime/buffer/models/buffer.model';

import {
	restoreBuffer,
	serializeBuffer
} from './buffer-persistence';

const CHAPTER_RESOURCE_TYPE =
	'kjvonly/bible/chapters';

const PARAGRAPHS_RESOURCE_TYPE =
	'kjvonly/overlays/paragraphs';

describe(
	'Buffer persistence',
	() => {
		it(
			'serializes only persisted Buffer state',
			() => {
				const buffer =
					new Buffer({
						[CHAPTER_RESOURCE_TYPE]: {
							publisher:
								'publisher-a',

							resourceId:
								`${CHAPTER_RESOURCE_TYPE}/kjvs`
						}
					});

				buffer.key =
					'buffer-a';

				buffer.name =
					'Bible';

				buffer.componentName =
					Modules.BIBLE;

				buffer.selected =
					true;

				buffer.bag = {
					bibleLocationRef:
						'1_1'
				};

				buffer.component =
					{
						runtime:
							true
					};

				buffer.keyboardBindings.set(
					'j',
					() => {}
				);

				const persisted =
					serializeBuffer(
						buffer
					);

				expect(
					persisted
				).toEqual({
					key:
						'buffer-a',

					name:
						'Bible',

					componentName:
						Modules.BIBLE,

					selected:
						true,

					bag: {
						bibleLocationRef:
							'1_1'
					},

					resourceSelections: {
						[CHAPTER_RESOURCE_TYPE]: {
							publisher:
								'publisher-a',

							resourceId:
								`${CHAPTER_RESOURCE_TYPE}/kjvs`
						}
					}
				});
			}
		);

		it(
			'restores exact Buffer identity, module context, and Resource selections',
			() => {
				const buffer =
					restoreBuffer({
						key:
							'buffer-a',

						name:
							'Bible',

						componentName:
							Modules.BIBLE,

						selected:
							false,

						bag: {
							bibleLocationRef:
								'10_1'
						},

						resourceSelections: {
							[CHAPTER_RESOURCE_TYPE]: {
								publisher:
									'publisher-a',

								resourceId:
									`${CHAPTER_RESOURCE_TYPE}/kjvs`
							},

							[PARAGRAPHS_RESOURCE_TYPE]: {
								publisher:
									'publisher-b',

								resourceId:
									`${PARAGRAPHS_RESOURCE_TYPE}/default`
							}
						}
					});

				expect(
					buffer
				).toBeInstanceOf(
					Buffer
				);

				expect(
					buffer.key
				).toBe(
					'buffer-a'
				);

				expect(
					buffer.componentName
				).toBe(
					Modules.BIBLE
				);

				expect(
					buffer.bag
				).toEqual({
					bibleLocationRef:
						'10_1'
				});

				expect(
					buffer.resourceSelections
				).toEqual({
					[CHAPTER_RESOURCE_TYPE]: {
						publisher:
							'publisher-a',

						resourceId:
							`${CHAPTER_RESOURCE_TYPE}/kjvs`
					},

					[PARAGRAPHS_RESOURCE_TYPE]: {
						publisher:
							'publisher-b',

						resourceId:
							`${PARAGRAPHS_RESOURCE_TYPE}/default`
					}
				});
			}
		);

		it(
			'restores runtime-only Buffer state from fresh defaults',
			() => {
				const buffer =
					restoreBuffer({
						key:
							'buffer-a',
						name:
							'Bible',
						componentName:
							Modules.BIBLE,
						selected:
							false,
						bag: {},
						resourceSelections: {}
					});

				expect(
					buffer.component
				).toBeUndefined();

				expect(
					buffer.keyboardBindings.size
				).toBe(
					0
				);

				expect(
					typeof buffer.onFocus
				).toBe(
					'function'
				);
			}
		);

		it(
			'accepts a legacy Buffer without Resource selections as an empty selection map',
			() => {
				const buffer =
					restoreBuffer({
						key:
							'legacy-buffer',
						name:
							'Bible',
						componentName:
							Modules.BIBLE,
						selected:
							false,
						bag: {
							bibleLocationRef:
								'1_1'
						}
					});

				expect(
					buffer.resourceSelections
				).toEqual({});
			}
		);

		it(
			'rejects an invalid Resource selection instead of rebuilding it from global state',
			() => {
				expect(
					() =>
						restoreBuffer({
							key:
								'buffer-a',
							name:
								'Bible',
							componentName:
								Modules.BIBLE,
							selected:
								false,
							bag: {},
							resourceSelections: {
								[CHAPTER_RESOURCE_TYPE]: {
									publisher:
										'publisher-a',

									resourceId:
										`${PARAGRAPHS_RESOURCE_TYPE}/default`
								}
							}
						})
				).toThrow(
					'Resource selection type mismatch'
				);
			}
		);

		it(
			'rejects an unknown persisted module',
			() => {
				expect(
					() =>
						restoreBuffer({
							key:
								'buffer-a',
							name:
								'Bible',
							componentName:
								999,
							selected:
								false,
							bag: {},
							resourceSelections: {}
						})
				).toThrow(
					'Invalid persisted Buffer module'
				);
			}
		);
	}
);
