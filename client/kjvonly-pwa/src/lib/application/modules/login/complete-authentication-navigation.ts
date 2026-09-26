import {
	Modules
} from '../../models/modules.model';

import type {
	PaneNavigationService
} from '../../services/pane-navigation.service';

import {
	PROFILE_VIEWS
} from '../profile/profile-navigation.model';

/**
 * Completes the Login flow without exposing a general-purpose stack reset.
 *
 * Authentication invalidates every Login view in the current Pane history.
 * Walk back to the invariant Modules root, then open the authenticated Profile
 * as a normal navigation entry.
 */
export function completeAuthenticationNavigation(
	navigation: Pick<
		PaneNavigationService,
		'back' | 'canGoBack' | 'pushModule'
	>
): void {
	while (navigation.canGoBack()) {
		navigation.back();
	}

	navigation.pushModule(
		Modules.PROFILE,
		PROFILE_VIEWS.ROOT,
		{}
	);
}
