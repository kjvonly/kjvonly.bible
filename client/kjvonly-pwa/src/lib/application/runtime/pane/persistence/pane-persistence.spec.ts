import {
	describe,
	expect,
	it
} from 'vitest';

import {
	Modules
} from '$lib/application/models/modules.model';

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

describe(
	'Pane persistence',
	() => {
		it(
			'serializes recursive Pane structure and runtime state',
			() => {
				const leftState = {
					navigation: [
						{
							module: Modules.BIBLE,
							view: 'bible.reader',
							state: {}
						}
					]
				};

				const root: Pane = {
					id: undefined,
					split: PaneSplit.HORIZONTAL,
					left: {
						id: 'a',
						state: leftState,
						left: undefined,
						right: undefined,
						split: undefined
					},
					right: {
						id: 'b',
						state: {},
						left: undefined,
						right: undefined,
						split: undefined
					},
					state: undefined
				};

				expect(
					serializePane(root)
				).toEqual({
					split: 'h',
					left: {
						id: 'a',
						state: leftState
					},
					right: {
						id: 'b',
						state: {}
					}
				});
			}
		);

		it(
			'restores a recursive Pane tree with exact runtime state',
			() => {
				const root =
					restorePane({
						split: 'v',
						left: {
							id: 'a',
							state: {
								navigation: []
							}
						},
						right: {
							id: 'b',
							state: {}
						}
					});

				expect(root.split).toBe(PaneSplit.VERTICAL);
				expect(root.id).toBeUndefined();
				expect(root.state).toBeUndefined();
				expect(root.left?.state).toEqual({
					navigation: []
				});
			}
		);

		it(
			'rejects a branch missing one child',
			() => {
				expect(
					() => restorePane({
						split: 'h',
						left: {
							id: 'a',
							state: {}
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
						split: 'diagonal',
						left: {},
						right: {}
					})
				).toThrow(
					'Invalid persisted Pane split'
				);
			}
		);

		it(
			'rejects a leaf without persisted Pane state',
			() => {
				expect(
					() => restorePane({
						id: 'a'
					})
				).toThrow(
					'Invalid persisted Pane state'
				);
			}
		);
	}
);
