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

import type {
	Pane
} from '$lib/application/runtime/pane/models/pane.model';

import {
	PaneSplit
} from '$lib/application/runtime/pane/models/pane-split';

import {
	restorePane,
	serializePane
} from './pane-persistence';

const CHAPTER_RESOURCE_TYPE =
	'kjvonly/bible/chapters';

const PARAGRAPHS_RESOURCE_TYPE =
	'kjvonly/overlays/paragraphs';

describe(
	'Pane persistence',
	() => {
		it(
			'serializes recursive Pane structure and persisted Buffer state only',
			() => {
				const leftBuffer =
					createBuffer(
						'buffer-a',
						Modules.BIBLE,
						{
							[CHAPTER_RESOURCE_TYPE]: {
								publisher:
									'publisher-a',
								resourceId:
									`${CHAPTER_RESOURCE_TYPE}/kjvs`
							}
						}
					);

				const root: Pane = {
					id:
						undefined,
					split:
						PaneSplit.HORIZONTAL,
					left: {
						id:
							'a',
						buffer:
							leftBuffer,
						left:
							undefined,
						right:
							undefined,
						split:
							undefined,
						toggle:
							true
					},
					right: {
						id:
							'b',
						buffer:
							createBuffer(
								'buffer-b',
								Modules.SEARCH,
								{}
							),
						left:
							undefined,
						right:
							undefined,
						split:
							undefined,
						toggle:
							false
					},
					buffer:
						leftBuffer,
					toggle:
						true
				};

				expect(
					serializePane(root)
				).toEqual({
					split:
						'h',
					left: {
						id:
							'a',
						buffer: {
							key:
								'buffer-a',
							componentName:
								Modules.BIBLE,
							bag: {},
							resourceSelections: {
								[CHAPTER_RESOURCE_TYPE]: {
									publisher:
										'publisher-a',
									resourceId:
										`${CHAPTER_RESOURCE_TYPE}/kjvs`
								}
							}
						}
					},
					right: {
						id:
							'b',
						buffer: {
							key:
								'buffer-b',
							componentName:
								Modules.SEARCH,
							bag: {},
							resourceSelections: {}
						}
					}
				});
			}
		);

		it(
			'restores a recursive Pane tree with real Buffers and exact Resource selections',
			() => {
				const root =
					restorePane({
						split:
							'v',
						left: {
							id:
								'a',
							buffer: {
								key:
									'buffer-a',
								name:
									'Bible',
								componentName:
									Modules.BIBLE,
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
							}
						},
						right: {
							id:
								'b',
							buffer: {
								key:
									'buffer-b',
								name:
									'Search',
								componentName:
									Modules.SEARCH,
								bag: {},
								resourceSelections: {}
							}
						}
					});

				expect(root.split).toBe(PaneSplit.VERTICAL);
				expect(root.id).toBeUndefined();
				expect(root.buffer).toBeUndefined();

				expect(root.left?.buffer).toBeInstanceOf(Buffer);

				const leftBuffer = root.left?.buffer;
				if (!leftBuffer) {
					throw new Error('Expected restored left Pane Buffer.');
				}

				expect(leftBuffer.key).toBe('buffer-a');
				expect(leftBuffer.bag).toEqual({
					bibleLocationRef:
						'10_1'
				});
				expect(leftBuffer.resourceSelections).toEqual({
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

				expect(root.left?.toggle).toBeUndefined();

			}
		);

		it(
			'accepts legacy leaf Buffer fields without Resource selections',
			() => {
				const pane =
					restorePane({
						id:
							'a',
						buffer: {
							key:
								'legacy-buffer',
							name:
								'Bible',
							componentName:
								Modules.BIBLE,
							selected:
								false,
							bag: {}
						}
					});

				expect(
					pane.buffer?.resourceSelections
				).toEqual({});
			}
		);

		it(
			'rejects a branch missing one child',
			() => {
				expect(
					() => restorePane({
						split:
							'h',
						left: {
							id:
								'a',
							buffer: {
								key:
									'buffer-a',
								name:
									'Bible',
								componentName:
									Modules.BIBLE,
								bag: {},
								resourceSelections: {}
							}
						}
					})
				).toThrow(
					'Invalid persisted Pane branch'
				);
			}
		);

		it(
			'rejects an unsupported split orientation',
			() => {
				expect(
					() => restorePane({
						split:
							'diagonal',
						left: {},
						right: {}
					})
				).toThrow(
					'Invalid persisted Pane split'
				);
			}
		);
	}
);

function createBuffer(
	key: string,
	module: Modules,
	resourceSelections:
		ConstructorParameters<typeof Buffer>[0]
): Buffer {
	const buffer =
		new Buffer(
			resourceSelections
		);

	buffer.key =
		key;

	buffer.componentName =
		module;

	return buffer;
}
