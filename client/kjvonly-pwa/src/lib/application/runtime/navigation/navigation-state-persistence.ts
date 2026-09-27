import {
	Modules
} from '../../models/modules.model';

import {
	MODULES_VIEWS
} from '../../modules/modules/modules-navigation.model';

import type {
	PaneState
} from '../pane/models/pane-state.model';

import type {
	NavigationState
} from '../../services/navigation.service';

/**
 * Reads the flat navigation stack persisted in Pane.state.navigation.
 *
 * Missing or pre-navigation values are treated as absent so the Pane starts
 * from the application's current initial navigation destination.
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

	if (
		first.module !== Modules.MODULES ||
		first.view !== MODULES_VIEWS.ROOT
	) {
		return undefined;
	}

	return value as NavigationState[];
}

/**
 * Owns the persisted flat navigation stack for one Pane.
 *
 * Runtime NavigationViews point at the same NavigationState objects stored in
 * Pane.state.navigation. Stack mutations therefore append/pop only the
 * changed entry instead of rebuilding the remaining navigation hierarchy.
 */
export class NavigationStatePersistence {
	constructor(
		private readonly paneState:
			PaneState |
			(() => PaneState | undefined),

		private readonly persistWorkspace:
			() => void
	) {}

	/**
	 * Returns the current persisted stack when it satisfies the structural
	 * navigation contract. Absent, legacy, or non-rooted values initialize as a
	 * fresh Pane; malformed navigation entries fail validation explicitly.
	 */
	restore(): NavigationState[] | undefined {
		return parseNavigationStates(
			this.getPaneState()
				?.navigation
		);
	}

	/**
	 * Drops unsupported persisted navigation before the current initial stack is
	 * created. The replacement stack is persisted by the normal append flow.
	 */
	discard(): void {
		const paneState =
			this.requirePaneState();

		paneState.navigation =
			undefined;
	}

	/**
	 * Appends the exact NavigationState object used by the runtime view and
	 * persists Workspace state immediately. Keeping object identity shared lets
	 * entry-scoped state updates mutate the persisted semantic entry in place.
	 */
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

	/**
	 * Removes and persists only the active entry while preserving the required
	 * root entry. Returns false when there is no legal navigation pop.
	 */
	pop(): boolean {
		const navigationStates =
			parseNavigationStates(
				this.getPaneState()
					?.navigation
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

	/**
	 * Persists semantic mutations made directly to an existing NavigationState.
	 * This does not rebuild or replace the navigation stack.
	 */
	persist(): void {
		this.persistWorkspace();
	}

	/**
	 * Returns the mutable persisted stack, creating the array only for a fresh
	 * Pane that has not yet received its initial navigation entries.
	 */
	private requireNavigationStates():
		NavigationState[] {
		const paneState =
			this.requirePaneState();

		const existing =
			parseNavigationStates(
				paneState.navigation
			);

		if (existing) {
			return existing;
		}

		const navigationStates:
			NavigationState[] = [];

		paneState.navigation =
			navigationStates;

		return navigationStates;
	}

	private getPaneState():
		PaneState | undefined {
		return typeof this.paneState ===
			'function'
			? this.paneState()
			: this.paneState;
	}

	private requirePaneState():
		PaneState {
		const paneState =
			this.getPaneState();

		if (!paneState) {
			throw new Error(
				'Navigation Pane state is not available'
			);
		}

		return paneState;
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
