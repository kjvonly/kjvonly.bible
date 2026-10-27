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

	/**
	 * Checks only whether the serialized view ID is currently registered.
	 * Module/view pairing and feature state validation remain feature concerns.
	 */
	canResolve(
		navigationState:
			Pick<NavigationState, 'view'>
	): boolean {
		return this.registry.has(
			navigationState.view
		);
	}

	/**
	 * Resolves the runtime component for a serialized NavigationState.
	 * No feature-specific semantic state is interpreted at this boundary.
	 */
	resolve(
		navigationState: NavigationState
	): NavigationComponent {
		return this.registry.require(
			navigationState.view
		);
	}
}
