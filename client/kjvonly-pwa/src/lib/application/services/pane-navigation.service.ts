import {
	get,
	type Readable
} from 'svelte/store';

import type {
	PublishedResourceReference
} from '$lib/resource';

import {
	Modules
} from '../models/modules.model';

import {
	MODULES_VIEWS
} from '../modules/modules/modules-navigation.model';

import type {
	ModuleResourceSelectionBuilder
} from '../resources/module-resource-selection-builder';

import type {
	NavigationStatePersistence
} from '../runtime/navigation/navigation-state-persistence';

import type {
	PaneSplit
} from '../runtime/pane/models/pane-split';

import type {
	NavigationViewResolver
} from '../runtime/rendering/navigation-view-resolver';

import type {
	NavigationStateBuilder
} from './navigation-state-builder';

import {
	NavigationService,
	type NavigationState,
	type NavigationStateValue,
	type NavigationView,
	type NavigationViewState
} from './navigation.service';

type NavigationResultHandler = (
	result: NavigationStateValue
) => void | Promise<void>;

type PaneNavigationSplitHandler = (
	split: PaneSplit,
	navigationStates:
		readonly NavigationState[]
) => boolean;

type PaneNavigationCloseHandler =
	() => boolean;

/**
 * Feature-facing Pane navigation contract.
 *
 * Views can request stack movement and Pane-level navigation operations without
 * receiving access to runtime stack internals or entry-scoped mutation APIs.
 */
export interface PaneNavigation {
	/**
	 * Pushes another view owned by the active Module while preserving the
	 * current entry underneath it.
	 */
	pushView<TView extends string | number>(
		view: TView,
		state: NavigationViewState
	): void;

	/**
	 * Pushes a view owned by another Module into the same flat Pane stack.
	 */
	pushModule<TView extends string | number>(
		module: Modules,
		view: TView,
		state: NavigationViewState
	): void;

	/**
	 * Opens a destination in a new Pane without changing the originating stack.
	 * New working Panes are rooted at `modules.root` before the destination.
	 */
	split<TView extends string | number>(
		split: PaneSplit,
		module: Modules,
		view: TView,
		state: NavigationViewState
	): void;

	/**
	 * Delivers an opaque result to the direct mounted parent before popping the
	 * active entry. A failed/missing handler leaves the child active.
	 */
	backWithResult(
		result: NavigationStateValue
	): Promise<void>;

	/**
	 * Pops one entry while preserving the Pane's required root entry.
	 */
	back(): void;

	/**
	 * Requests structural removal of this Pane. Workspace may reject removal of
	 * the final Pane, so callers must not assume the Pane was deleted.
	 */
	closePane(): boolean;
}

/**
 * Pane-scoped navigation facade over the generic NavigationService stack.
 *
 * Feature views receive the narrower PaneNavigation contract. Runtime shell
 * code uses this concrete service for stack rendering, persistence, result
 * delivery, and active-entry Resource updates.
 */
export class PaneNavigationService
	implements PaneNavigation {
	readonly views:
		Readable<NavigationView[]>;

	private readonly resultHandlers =
		new Map<
			NavigationState,
			Set<NavigationResultHandler>
		>();

	constructor(
		readonly paneID: string,

		private readonly stack:
			NavigationService,

		private readonly states:
			NavigationStateBuilder,

		private readonly resolver:
			NavigationViewResolver,

		private readonly resourceSelections:
			Pick<
				ModuleResourceSelectionBuilder,
				'independent' | 'update'
			>,

		private readonly persistence?:
			Pick<
				NavigationStatePersistence,
				'append' | 'pop' | 'persist'
			>,

		private readonly splitPane?:
			PaneNavigationSplitHandler,

		private readonly closePaneHandler?:
			PaneNavigationCloseHandler
	) {
		this.views = stack.views;
	}

	/**
	 * Pushes another view owned by the active Module.
	 */
	pushView<TView extends string | number>(
		view: TView,
		state: NavigationViewState
	): NavigationState<TView> {
		const originatingState =
			this.requireActiveState();

		return this.push(
			originatingState.module,
			view,
			state,
			originatingState
		);
	}

	/**
	 * Pushes a view owned by the requested Module into this Pane's flat stack.
	 */
	pushModule<TView extends string | number>(
		module: Modules,
		view: TView,
		state: NavigationViewState
	): NavigationState<TView> {
		return this.push(
			module,
			view,
			state,
			this.findActiveState()
		);
	}

	/**
	 * Creates a new Pane with Modules as its base navigation entry, then places
	 * the requested related destination on top. Splitting directly to Modules
	 * creates only the Modules entry and does not duplicate it.
	 *
	 * The current Pane stack is not changed. Workspace placement and persistence
	 * are delegated through the Pane runtime's split collaborator.
	 */
	split<TView extends string | number>(
		split: PaneSplit,
		module: Modules,
		view: TView,
		state: NavigationViewState
	): NavigationState<TView> | undefined {
		const isModulesRoot =
			module === Modules.MODULES &&
			view === MODULES_VIEWS.ROOT;

		const navigationState =
			isModulesRoot
				? this.states.create(
					module,
					view,
					state
				)
				: this.states.create(
					module,
					view,
					state,
					this.requireActiveState()
				);

		const navigationStates:
			readonly NavigationState[] =
			isModulesRoot
				? [navigationState]
				: [
					this.states.create(
						Modules.MODULES,
						MODULES_VIEWS.ROOT,
						{}
					),
					navigationState
				];

		// Fail before mutating Workspace state if either split entry is unregistered.
		for (const state of navigationStates) {
			this.resolver.resolve(
				state
			);
		}

		if (!this.splitPane) {
			throw new Error(
				`Pane split is not available for Pane: ${this.paneID}`
			);
		}

		if (
			!this.splitPane(
				split,
				navigationStates
			)
		) {
			return undefined;
		}

		return navigationState;
	}

	/**
	 * Rebuilds the runtime stack from persisted NavigationState objects.
	 *
	 * The persisted objects are reused directly so each mounted view and the
	 * Pane persistence state refer to the same navigation-owned state.
	 */
	hydrate(
		navigationStates:
			readonly NavigationState[]
	): void {
		this.stack.hydrate(
			navigationStates.map(
				(navigationState) => ({
					component:
						this.resolver.resolve(
							navigationState
						),
					navigationState
				})
			)
		);
	}

	/**
	 * Registers a runtime-only result handler for one mounted navigation entry.
	 *
	 * Result handlers are intentionally not persisted. The owning view remains
	 * mounted while covered by later entries, so it can receive a result before
	 * the active entry is popped.
	 */
	onResult(
		navigationState: NavigationState,
		handler: NavigationResultHandler
	): () => void {
		let handlers =
			this.resultHandlers.get(
				navigationState
			);

		if (!handlers) {
			handlers =
				new Set();

			this.resultHandlers.set(
				navigationState,
				handlers
			);
		}

		handlers.add(
			handler
		);

		return () => {
			handlers?.delete(
				handler
			);

			if (
				handlers?.size === 0
			) {
				this.resultHandlers.delete(
					navigationState
				);
			}
		};
	}

	/**
	 * Returns a result to the previous mounted entry, then navigates Back.
	 *
	 * The result is handled before the active entry is removed so a failed
	 * feature update cannot silently discard the completion event.
	 */
	async backWithResult(
		result: NavigationStateValue
	): Promise<void> {
		const views =
			get(this.stack.views);

		if (views.length <= 1) {
			return;
		}

		const previousState =
			views[
				views.length - 2
			]?.navigationState;

		if (!previousState) {
			throw new Error(
				`Previous navigation state not found for Pane: ${this.paneID}`
			);
		}

		const handlers =
			this.resultHandlers.get(
				previousState
			);

		if (!handlers || handlers.size === 0) {
			throw new Error(
				`Navigation result handler not found for Pane: ${this.paneID}`
			);
		}

		await Promise.all(
			Array.from(handlers).map(
				(handler) =>
					handler(result)
			)
		);

		this.back();
	}

	/**
	 * Persists the root-preserving pop before publishing the runtime stack
	 * change. Hidden entries can react synchronously when they become active, so
	 * persistence must already describe the stack subscribers observe.
	 */
	back(): void {
		const views =
			get(this.stack.views);

		if (views.length <= 1) {
			return;
		}

		// Persist before publishing the runtime stack change. Store subscribers
		// may navigate synchronously when a hidden entry becomes active. They must
		// observe persistence that already matches the stack they were notified of.
		this.persistence?.pop();
		this.stack.back();
	}

	/**
	 * Requests removal of this Pane from the Workspace.
	 *
	 * Workspace owns the Pane tree and may refuse the request when this is the
	 * final Pane. Feature views should use this boundary rather than mutating
	 * Workspace geometry directly.
	 */
	closePane(): boolean {
		if (!this.closePaneHandler) {
			throw new Error(
				`Pane close is not available for Pane: ${this.paneID}`
			);
		}

		return this.closePaneHandler();
	}

	/**
	 * Persists the current Pane navigation state without changing the stack.
	 *
	 * Entry-scoped state mutation is owned by NavigationEntryContext; this
	 * method only exposes the persistence boundary it requires.
	 */
	persist(): void {
		this.persistence?.persist();
	}


	/**
	 * Updates one Resource selection on the active NavigationState through the
	 * Module's existing Resource-selection policy.
	 */
	updateResourceSelection(
		resourceType: string,
		value: PublishedResourceReference
	): void {
		const navigationState =
			this.requireActiveState();

		const selections =
			navigationState.state
				.resourceSelections ??
			this.resourceSelections
				.independent(
					navigationState.module
				);

		navigationState.state.resourceSelections =
			this.resourceSelections.update(
				navigationState.module,
				selections,
				resourceType,
				value
			);

		this.persistence?.persist();
	}

	/**
	 * Constructs, resolves, persists, then publishes one navigation entry.
	 *
	 * This ordering is intentional: runtime store subscribers may synchronously
	 * issue another navigation action as soon as the new entry is published.
	 */
	private push<TView extends string | number>(
		module: Modules,
		view: TView,
		state: NavigationViewState,
		originatingState?: NavigationState
	): NavigationState<TView> {
		const navigationState =
			this.states.create(
				module,
				view,
				state,
				originatingState
			);

		const component =
			this.resolver.resolve(
				navigationState
			);

		// Persist before publishing the runtime stack change for the same reason
		// as Back: subscribers may synchronously issue another navigation action.
		this.persistence?.append(
			navigationState
		);

		this.stack.push({
			component,
			navigationState
		});

		return navigationState;
	}

	private findActiveState():
		NavigationState | undefined {
		const views =
			get(this.stack.views);

		const active =
			views[
				views.length - 1
			];

		return active?.navigationState;
	}

	private requireActiveState():
		NavigationState {
		const navigationState =
			this.findActiveState();

		if (!navigationState) {
			throw new Error(
				`Navigation stack is empty for Pane: ${this.paneID}`
			);
		}

		return navigationState;
	}
}
