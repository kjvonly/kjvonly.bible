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

/**
 * Pane-scoped navigation facade over the generic NavigationService stack.
 *
 * Feature views request semantic navigation operations through this service;
 * stack mechanics, NavigationState creation, component resolution, and
 * Resource-selection updates remain application concerns.
 */
export class PaneNavigationService {
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
			PaneNavigationSplitHandler
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
					obj: {
						navigationState
					}
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
			]?.obj.navigationState as
				NavigationState |
				undefined;

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

	back(): void {
		const before =
			get(this.stack.views).length;

		this.stack.back();

		const after =
			get(this.stack.views).length;

		if (after < before) {
			this.persistence?.pop();
		}
	}

	canGoBack(): boolean {
		return (
			get(this.stack.views).length > 1
		);
	}

	/**
	 * Updates semantic state owned by one mounted navigation entry.
	 *
	 * Resource selections use updateResourceSelection() so Module Resource
	 * policy remains centralized in ModuleResourceSelectionBuilder.
	 */
	updateViewState(
		navigationState: NavigationState,
		key: string,
		value: NavigationStateValue | undefined
	): void {
		if (key === 'resourceSelections') {
			throw new Error(
				'Resource selections must be updated through updateResourceSelection().'
			);
		}

		if (value === undefined) {
			delete navigationState.state[key];
		} else {
			navigationState.state[key] = value;
		}

		this.persistence?.persist();
	}

	/**
	 * Returns whether the supplied state is the active top entry in this Pane.
	 */
	isActive(
		navigationState: NavigationState
	): boolean {
		return (
			this.findActiveState() ===
			navigationState
		);
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

		this.stack.push({
			component:
				this.resolver.resolve(
					navigationState
				),
			obj: {
				navigationState
			}
		});

		this.persistence?.append(
			navigationState
		);

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

		return active?.obj
			.navigationState as
				NavigationState |
				undefined;
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
