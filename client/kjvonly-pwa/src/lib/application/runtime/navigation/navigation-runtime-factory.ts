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

import type {
	NavigationRuntimeContext
} from './navigation-runtime-context';

import type {
	Modules
} from '../../models/modules.model';

import type {
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

interface NavigationWorkspace {
	findPane(
		paneID: string
	): {
		state?: PaneState;
	} | undefined;

	persistWorkspace(): void;

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

	create(
		paneID: string
	): NavigationRuntimeContext {
		const paneState =
			this.workspace.findPane(
				paneID
			)?.state;

		const persistence =
			paneState
				? new NavigationStatePersistence(
					() => this.workspace
						.findPane(
							paneID
						)
						?.state,
					() => this.workspace
						.persistWorkspace()
				)
				: undefined;

		const navigation =
			new PaneNavigationService(
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
				)
			);

		const navigationStates =
			persistence?.restore();

		if (navigationStates) {
			navigation.hydrate(
				navigationStates
			);
		} else {
			const destinations =
				this.createInitialDestinations();

			if (destinations.length === 0) {
				throw new Error(
					'Initial Pane navigation destinations are required'
				);
			}

			for (const destination of destinations) {
				navigation.pushModule(
					destination.module,
					destination.view,
					destination.state
				);
			}
		}

		return {
			navigation
		};
	}
}
