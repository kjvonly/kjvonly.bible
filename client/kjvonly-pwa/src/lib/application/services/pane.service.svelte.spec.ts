import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	PaneService
} from './pane.service.svelte';

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
					id: 'a',
					split: undefined,
					left: undefined,
					right: undefined,
					state: undefined
				};
			}
		);

		afterEach(
			() => {
				vi.unstubAllGlobals();
			}
		);

		it(
			'saves Pane runtime state through the persistence boundary',
			() => {
				paneService.rootPane = {
					id: 'a',
					state: {
						navigation: []
					},
					split: undefined,
					left: undefined,
					right: undefined
				};

				paneService.save();

				expect(
					JSON.parse(
						values.get('pane') ?? ''
					)
				).toEqual({
					id: 'a',
					state: {
						navigation: []
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
			'restores persisted Pane runtime state',
			() => {
				values.set(
					'pane',
					JSON.stringify({
						id: 'a',
						state: {
							navigation: []
						}
					})
				);

				expect(
					paneService.restore()
				).toBe(true);

				expect(
					paneService.rootPane.state
				).toEqual({
					navigation: []
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
