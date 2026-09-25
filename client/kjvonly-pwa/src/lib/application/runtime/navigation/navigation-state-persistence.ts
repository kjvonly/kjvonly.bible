import {
	Modules
} from '../../models/modules.model';

import type {
	BufferState
} from '../buffer/models/buffer-state.model';

import type {
	NavigationState
} from '../../services/navigation.service';

/**
 * Reads the generic flat navigation stack persisted in Buffer.state.navigation.
 *
 * During migration some Modules still persist their older feature-specific
 * navigation shape. Those entries do not include `module`, so they are left to
 * their existing restore path until the Module is migrated.
 */
export function parseNavigationStates(
	value: unknown
): NavigationState[] | undefined {
	if (
		!Array.isArray(value) ||
		value.length === 0
	) {
		return undefined;
	}

	const first = value[0];

	if (
		!isRecord(first) ||
		first.module === undefined
	) {
		return undefined;
	}

	for (const entry of value) {
		validateNavigationState(
			entry
		);
	}

	return value as NavigationState[];
}

/**
 * Owns the persisted flat navigation stack for one Pane Buffer.
 *
 * Runtime NavigationViews point at the same NavigationState objects stored in
 * Buffer.state.navigation. Stack mutations therefore append/pop only the
 * changed entry instead of rebuilding the remaining navigation hierarchy.
 */
export class NavigationStatePersistence {
	constructor(
		private readonly bufferState:
			BufferState,

		private readonly persistWorkspace:
			() => void
	) {}

	restore(): NavigationState[] | undefined {
		return parseNavigationStates(
			this.bufferState.navigation
		);
	}

	append(
		navigationState: NavigationState
	): void {
		const navigationStates =
			this.requireNavigationStates();

		navigationStates.push(
			navigationState
		);

		this.persistWorkspace();
	}

	pop(): boolean {
		const navigationStates =
			parseNavigationStates(
				this.bufferState.navigation
			);

		if (
			!navigationStates ||
			navigationStates.length <= 1
		) {
			return false;
		}

		navigationStates.pop();
		this.persistWorkspace();

		return true;
	}

	clear(): void {
		delete this.bufferState.navigation;
		this.persistWorkspace();
	}

	persist(): void {
		this.persistWorkspace();
	}

	private requireNavigationStates():
		NavigationState[] {
		const existing =
			parseNavigationStates(
				this.bufferState.navigation
			);

		if (existing) {
			return existing;
		}

		const navigationStates:
			NavigationState[] = [];

		this.bufferState.navigation =
			navigationStates;

		return navigationStates;
	}
}

function validateNavigationState(
	value: unknown
): asserts value is NavigationState {
	if (!isRecord(value)) {
		throw new Error(
			'Invalid persisted navigation state'
		);
	}

	if (!isModule(value.module)) {
		throw new Error(
			'Invalid persisted navigation module'
		);
	}

	if (
		typeof value.view !== 'string' &&
		typeof value.view !== 'number'
	) {
		throw new Error(
			'Invalid persisted navigation view'
		);
	}

	if (!isRecord(value.state)) {
		throw new Error(
			'Invalid persisted navigation view state'
		);
	}
}

function isModule(
	value: unknown
): value is Modules {
	return (
		typeof value === 'number' &&
		Modules[value] !== undefined
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
