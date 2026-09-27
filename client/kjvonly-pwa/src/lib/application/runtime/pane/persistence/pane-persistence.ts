import type {
	Pane
} from '$lib/application/runtime/pane/models/pane.model';

import type {
	PaneState
} from '$lib/application/runtime/pane/models/pane-state.model';

import {
	PaneSplit
} from '$lib/application/runtime/pane/models/pane-split';

export interface PersistedLeafPane {
	id: string;
	state: PaneState;
}

export interface PersistedBranchPane {
	split: PaneSplit;
	left: PersistedPane;
	right: PersistedPane;
}

export type PersistedPane =
	| PersistedLeafPane
	| PersistedBranchPane;

export function serializePane(
	pane: Pane
): PersistedPane {
	if (
		pane.left !== undefined ||
		pane.right !== undefined
	) {
		if (
			pane.left === undefined ||
			pane.right === undefined
		) {
			throw new Error(
				'Invalid Pane branch'
			);
		}

		if (!isSplit(pane.split)) {
			throw new Error(
				'Invalid Pane split'
			);
		}

		return {
			split:
				pane.split,

			left:
				serializePane(
					pane.left
				),

			right:
				serializePane(
					pane.right
				)
		};
	}

	if (
		typeof pane.id !== 'string' ||
		pane.id.length === 0
	) {
		throw new Error(
			'Invalid Pane id'
		);
	}

	if (pane.state === undefined) {
		throw new Error(
			'Invalid Pane state'
		);
	}

	return {
		id:
			pane.id,

		state:
			pane.state
	};
}

export function restorePane(
	value: unknown
): Pane {
	const persisted =
		parsePersistedPane(
			value
		);

	if (isPersistedBranchPane(persisted)) {
		return {
			id:
				undefined,

			split:
				persisted.split,

			left:
				restorePane(
					persisted.left
				),

			right:
				restorePane(
					persisted.right
				),

			state:
				undefined
		};
	}

	return {
		id:
			persisted.id,

		split:
			undefined,

		left:
			undefined,

		right:
			undefined,

		state:
			persisted.state
	};
}

function parsePersistedPane(
	value: unknown
): PersistedPane {
	if (!isRecord(value)) {
		throw new Error(
			'Invalid persisted Pane'
		);
	}

	const hasBranchState =
		value.left !== undefined ||
		value.right !== undefined ||
		value.split !== undefined;

	if (hasBranchState) {
		if (!isSplit(value.split)) {
			throw new Error(
				'Invalid persisted Pane split'
			);
		}

		if (
			value.left === undefined ||
			value.right === undefined
		) {
			throw new Error(
				'Invalid persisted Pane branch'
			);
		}

		return {
			split:
				value.split,

			left:
				parsePersistedPane(
					value.left
				),

			right:
				parsePersistedPane(
					value.right
				)
		};
	}

	if (
		typeof value.id !== 'string' ||
		value.id.length === 0
	) {
		throw new Error(
			'Invalid persisted Pane id'
		);
	}

	return {
		id:
			value.id,

		state:
			parsePaneState(
				value.state
			)
	};
}

function parsePaneState(
	value: unknown
): PaneState {
	if (
		typeof value !== 'object' ||
		value === null ||
		Array.isArray(value)
	) {
		throw new Error(
			'Invalid persisted Pane state'
		);
	}

	return value as PaneState;
}

function isPersistedBranchPane(
	pane: PersistedPane
): pane is PersistedBranchPane {
	return 'split' in pane;
}

function isSplit(
	value: unknown
): value is PaneSplit {
	return (
		value === PaneSplit.HORIZONTAL ||
		value === PaneSplit.VERTICAL
	);
}

function isRecord(
	value: unknown
): value is Record<string, unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value)
	);
}
