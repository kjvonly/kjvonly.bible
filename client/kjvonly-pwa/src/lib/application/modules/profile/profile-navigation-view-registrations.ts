import type {
	NavigationViewRegistration
} from '../../runtime/rendering/navigation-view-registry';

import {
	PROFILE_VIEWS,
	type ProfileView
} from './profile-navigation.model';

import Profile from './profile/profile.svelte';
import EditProfile from './profile/edit/editProfile.svelte';

/**
 * Profile-owned navigation views registered by the application composition root.
 */
export const profileNavigationViewRegistrations:
	readonly NavigationViewRegistration<ProfileView>[] = [
		{
			view: PROFILE_VIEWS.ROOT,
			component: Profile
		},
		{
			view: PROFILE_VIEWS.EDIT,
			component: EditProfile
		}
	];
