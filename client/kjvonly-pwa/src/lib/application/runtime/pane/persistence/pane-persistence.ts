import type {
	Pane
} from '$lib/application/runtime/pane/models/pane.model';

import type {
	PersistedBuffer
} from '$lib/application/runtime/buffer/persistence/buffer-persistence';

import {
	restoreBuffer,
	serializeBuffer
} from '$lib/application/runtime/buffer/persistence/buffer-persistence';

export interface PersistedLeafPane {
	id: string;
	buffer: PersistedBuffer;
}

export interface PersistedBranchPane {
	split: 'h' | 'v';
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

	if (pane.buffer === undefined) {
		throw new Error(
			'Invalid Pane Buffer'
		);
	}

	return {
		id:
			pane.id,

		buffer:
			serializeBuffer(
				pane.buffer
			)
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

			buffer:
				undefined,

			updateBuffer:
				undefined,

			toggle:
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

		buffer:
			restoreBuffer(
				persisted.buffer
			),

		updateBuffer:
			undefined,

		toggle:
			undefined
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

	if (value.buffer === undefined) {
		throw new Error(
			'Invalid persisted Pane Buffer'
		);
	}

	return {
		id:
			value.id,

		buffer:
			value.buffer as PersistedBuffer
	};
}

function isPersistedBranchPane(
	pane: PersistedPane
): pane is PersistedBranchPane {
	return 'split' in pane;
}

function isSplit(
	value: unknown
): value is 'h' | 'v' {
	return (
		value === 'h' ||
		value === 'v'
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
