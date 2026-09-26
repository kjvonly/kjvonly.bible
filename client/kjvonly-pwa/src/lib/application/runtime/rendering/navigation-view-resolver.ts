import type {
	NavigationComponent,
	NavigationState
} from '$lib/application/services/navigation.service';

import type {
	NavigationViewRegistry
} from './navigation-view-registry';

/**
 * Resolves a serialized navigation view ID to its registered runtime component.
 */
export class NavigationViewResolver {
	constructor(
		private readonly registry:
			NavigationViewRegistry
	) {}

	resolve(
		navigationState: NavigationState
	): NavigationComponent {
		return this.registry.require(
			navigationState.view
		);
	}
}
