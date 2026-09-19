import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	Modules
} from '$lib/application/models/modules.model';

import {
	Buffer
} from '$lib/application/runtime/buffer/models/buffer.model';

import {
	PaneService
} from './pane.service.svelte';

const CHAPTER_RESOURCE_TYPE =
	'kjvonly/bible/chapters';

describe(
	'PaneService persistence',
	() => {
		let values:
			Map<string, string>;

		let paneService:
			PaneService;

		beforeEach(
			() => {
				values =
					new Map();

				vi.stubGlobal(
					'localStorage',
					{
						getItem:
							(key: string) =>
								values.get(key) ?? null,

						setItem:
							(key: string, value: string) => {
								values.set(key, value);
							}
					}
				);

				paneService =
					new PaneService(
						localStorage
					);

				paneService.rootPane = {
					id:
						'a',
					split:
						undefined,
					left:
						undefined,
					right:
						undefined,
					buffer:
						undefined
				};
			}
		);

		afterEach(
			() => {
				vi.unstubAllGlobals();
			}
		);

		it(
			'saves the Pane tree through the persistence boundary',
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
				buffer.componentName =
					Modules.BIBLE;

				paneService.rootPane = {
					id:
						'a',
					buffer,
					split:
						undefined,
					left:
						undefined,
					right:
						undefined,
					toggle:
						true
				};

				paneService.save();

				expect(
					JSON.parse(
						values.get('pane') ?? ''
					)
				).toEqual({
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
				});
			}
		);

		it(
			'returns false when no Workspace is persisted',
			() => {
				expect(
					paneService.restore()
				).toBe(false);
			}
		);

		it(
			'restores real Buffers with their exact Resource selections',
			() => {
				values.set(
					'pane',
					JSON.stringify({
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
								}
							}
						}
					})
				);

				expect(
					paneService.restore()
				).toBe(true);

				expect(
					paneService.rootPane.buffer
				).toBeInstanceOf(Buffer);

				expect(
					paneService.rootPane.buffer.resourceSelections
				).toEqual({
					[CHAPTER_RESOURCE_TYPE]: {
						publisher:
							'publisher-a',
						resourceId:
							`${CHAPTER_RESOURCE_TYPE}/kjvs`
					}
				});
			}
		);
	}
);

describe(
	'Pane dimensions',
	() => {
		it(
			'publishes the full Pane-dimensions map to subscribers',
			() => {
				const paneService =
					new PaneService({
						getItem: () => null,
						setItem: () => undefined
					});
				const subscriber = vi.fn();
				const paneDimensionsByID = {
					a: {
						height: 1,
						width: 0.5
					},
					b: {
						height: 1,
						width: 0.5
					}
				};

				paneService.subscribeToPaneDimensions(
					'a',
					subscriber
				);

				paneService.publishPaneDimensions(
					paneDimensionsByID
				);

				expect(
					subscriber
				).toHaveBeenCalledWith(
					paneDimensionsByID
				);
			}
		);
	}
);
