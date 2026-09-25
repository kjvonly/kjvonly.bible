import type {
	ModuleResourceSelectionBuilder
} from '../../resources/module-resource-selection-builder';

import type {
	NavigationServiceFactory
} from '../../services/navigation-service-factory';

import type {
	NavigationStateBuilder
} from '../../services/navigation-state-builder';

import {
	PaneNavigationService
} from '../../services/pane-navigation.service';

import type {
	BufferState
} from '../buffer/models/buffer-state.model';

import type {
	NavigationViewResolver
} from '../rendering/navigation-view-resolver';

import type {
	NavigationRuntimeContext
} from './navigation-runtime-context';

import {
	NavigationStatePersistence
} from './navigation-state-persistence';

interface NavigationWorkspace {
	findPane(
		paneID: string
	): {
		buffer?: {
			state: BufferState;
		};
	} | undefined;

	persistWorkspace(): void;
}

/**
 * Creates one isolated navigation runtime for one rendered Pane.
 */
export class NavigationRuntimeFactory {
	constructor(
		private readonly navigationServices:
			NavigationServiceFactory,

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
			NavigationWorkspace
	) {}

	create(
		paneID: string
	): NavigationRuntimeContext {
		const bufferState =
			this.workspace.findPane(
				paneID
			)?.buffer?.state;

		const persistence =
			bufferState
				? new NavigationStatePersistence(
					bufferState,
					() => this.workspace
						.persistWorkspace()
				)
				: undefined;

		const navigation =
			new PaneNavigationService(
				paneID,
				this.navigationServices
					.create(),
				this.navigationStates,
				this.navigationViews,
				this.resourceSelections,
				persistence
			);

		const navigationStates =
			persistence?.restore();

		if (navigationStates) {
			navigation.hydrate(
				navigationStates
			);
		}

		return {
			paneID,
			navigation
		};
	}
}
