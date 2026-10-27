import type {
	ModuleResourceSelectionBuilder
} from '../../resources/module-resource-selection-builder';

import {
	NavigationService
} from '../../services/navigation.service';

import type {
	NavigationStateBuilder
} from '../../services/navigation-state-builder';

import {
	PaneNavigationService
} from '../../services/pane-navigation.service';

import type {
	PaneState
} from '../pane/models/pane-state.model';

import type {
	PaneNavigationSplitter
} from '../pane/pane-navigation-splitter';

import type {
	NavigationViewResolver
} from '../rendering/navigation-view-resolver';

import {
	Modules
} from '../../models/modules.model';

import type {
	NavigationState,
	NavigationViewState
} from '../../services/navigation.service';

import {
	NavigationStatePersistence
} from './navigation-state-persistence';

export interface NavigationInitialDestination<
	TView extends string | number = string | number
> {
	readonly module: Modules;
	readonly view: TView;
	readonly state: NavigationViewState;
}

export type NavigationInitialDestinationsFactory =
	() => readonly NavigationInitialDestination[];

export interface PaneNavigationRuntime {
	readonly navigation:
		PaneNavigationService;
}

interface NavigationWorkspace {
	findPane(
		paneID: string
	): {
		state?: PaneState;
	} | undefined;

	persistWorkspace(): void;

	deletePane(
		paneID: string
	): { deletedPaneID: string } | undefined;

}

/**
 * Creates one isolated navigation runtime for one rendered Pane.
 */
export class NavigationRuntimeFactory {
	constructor(
		private readonly navigationStates:
			NavigationStateBuilder,

		private readonly navigationViews:
			NavigationViewResolver,

		private readonly resourceSelections:
			Pick<
				ModuleResourceSelectionBuilder,
				'independent' | 'update'
			>,

		private readonly workspace:
			NavigationWorkspace,

		private readonly paneSplitter:
			Pick<
				PaneNavigationSplitter,
				'split'
			>,

		private readonly createInitialDestinations:
			NavigationInitialDestinationsFactory
	) {}

	/**
	 * Creates one isolated navigation runtime for a rendered Pane.
	 *
	 * Runtime construction is intentionally orchestration-only here: persistence
	 * and the concrete Pane service are created first, then the Pane either
	 * hydrates its supported persisted stack or initializes the current stack.
	 */
	create(
		paneID: string
	): PaneNavigationRuntime {
		const persistence =
			this.createPersistence(
				paneID
			);

		const navigation =
			this.createPaneNavigation(
				paneID,
				persistence
			);

		this.restoreOrInitializeNavigation(
			navigation,
			persistence
		);

		return {
			navigation
		};
	}

	/**
	 * Creates the persistence adapter for one rendered leaf Pane.
	 *
	 * Rendered Panes are leaf Panes and must own PaneState. Branch Panes are not
	 * rendered. Failing here prevents an invalid leaf from silently receiving a
	 * non-persisted navigation runtime.
	 *
	 * The adapter resolves Pane state lazily so Workspace structural changes do
	 * not leave navigation holding a stale PaneState object reference.
	 */
	private createPersistence(
		paneID: string
	): NavigationStatePersistence {
		const paneState =
			this.workspace.findPane(
				paneID
			)?.state;

		if (!paneState) {
			throw new Error(
				`Navigation Pane state is not available: ${paneID}`
			);
		}

		return new NavigationStatePersistence(
			() => this.workspace
				.findPane(
					paneID
				)
				?.state,
			() => this.workspace
				.persistWorkspace()
		);
	}

	/**
	 * Creates the concrete runtime-shell navigation service for one Pane.
	 *
	 * Workspace geometry remains behind the split/close callbacks so the Pane
	 * navigation service does not own the Workspace tree directly.
	 */
	private createPaneNavigation(
		paneID: string,
		persistence:
			NavigationStatePersistence
	): PaneNavigationService {
		return new PaneNavigationService(
			paneID,
			new NavigationService(),
			this.navigationStates,
			this.navigationViews,
			this.resourceSelections,
			persistence,
			(
				split,
				navigationStates
			) => Boolean(
				this.paneSplitter.split(
					paneID,
					split,
					navigationStates
				)
			),
			() => Boolean(
				this.workspace.deletePane(
					paneID
				)
			)
		);
	}

	/**
	 * Restores a supported persisted stack or initializes the Pane from the
	 * application's current initial navigation destinations.
	 */
	private restoreOrInitializeNavigation(
		navigation: PaneNavigationService,
		persistence:
			NavigationStatePersistence
	): void {
		const navigationStates =
			persistence.restore();

		if (
			navigationStates &&
			this.canHydratePersistedNavigation(
				navigationStates
			)
		) {
			navigation.hydrate(
				navigationStates
			);
			return;
		}

		const destinations =
			this.requireInitialDestinations();

		this.assertRegisteredInitialDestinations(
			destinations
		);

		this.discardUnregisteredPersistedNavViews(
			navigationStates,
			persistence
		);

		this.initializeNavigation(
			navigation,
			destinations
		);
	}

	/**
	 * Returns whether every persisted navigation view can still be resolved by
	 * the current registry. Removed or renamed view IDs are not compatibility-
	 * mapped; they cause this Pane to initialize from the current destinations.
	 */
	private canHydratePersistedNavigation(
		navigationStates:
			readonly NavigationState[]
	): boolean {
		return navigationStates.every(
			(navigationState) =>
				this.navigationViews
					.canResolve(
						navigationState
					)
		);
	}

	/**
	 * Creates and validates the semantic destinations used for a fresh Pane.
	 * Validation happens before any destination is persisted.
	 */
	private requireInitialDestinations():
		readonly NavigationInitialDestination[] {
		const destinations =
			this.createInitialDestinations();

		if (destinations.length === 0) {
			throw new Error(
				'Initial Pane navigation destinations are required'
			);
		}

		assertModulesRoot(
			destinations[0]
		);

		return destinations;
	}

	/**
	 * Verifies that every fresh destination has a current registered runtime
	 * component before any navigation state is appended to the Pane.
	 */
	private assertRegisteredInitialDestinations(
		destinations:
			readonly NavigationInitialDestination[]
	): void {
		for (const destination of destinations) {
			if (
				!this.navigationViews
					.canResolve(
						destination
					)
			) {
				throw new Error(
					`Initial Pane navigation view is not registered: ${destination.view}`
				);
			}
		}
	}

	/**
	 * Discards a structurally valid persisted stack whose view IDs are no longer
	 * registered. The current initial destinations are persisted immediately
	 * afterward through the normal push flow.
	 */
	private discardUnregisteredPersistedNavViews(
		navigationStates:
			readonly NavigationState[] | undefined,
		persistence:
			NavigationStatePersistence
	): void {
		if (navigationStates) {
			persistence.discard();
		}
	}

	/**
	 * Pushes an already validated fresh destination sequence into the Pane.
	 */
	private initializeNavigation(
		navigation: PaneNavigationService,
		destinations:
			readonly NavigationInitialDestination[]
	): void {
		for (const destination of destinations) {
			navigation.pushModule(
				destination.module,
				destination.view,
				destination.state
			);
		}
	}

}

/**
 * Enforces the invariant that every fresh Pane navigation stack starts at
 * modules.root before any navigation state is persisted.
 */
function assertModulesRoot(
	destination:
		NavigationInitialDestination | undefined
): void {
	if (
		destination?.module !== Modules.MODULES ||
		destination.view !== 'modules.root'
	) {
		throw new Error(
			'Initial Pane navigation must begin with modules.root'
		);
	}
}
