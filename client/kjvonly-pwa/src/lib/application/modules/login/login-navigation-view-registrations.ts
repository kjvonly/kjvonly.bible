import type {
	NavigationViewRegistration
} from '../../runtime/rendering/navigation-view-registry';

import {
	LOGIN_VIEWS,
	type LoginView
} from './login-navigation.model';

import CreateAccount from './createAccount/createAccount.svelte';
import LoginOptions from './loginOptions/loginOptions.svelte';
import NsecLogin from './nsec/nsecLogin.svelte';

/**
 * Login-owned navigation views registered by the application composition root.
 */
export const loginNavigationViewRegistrations:
	readonly NavigationViewRegistration<LoginView>[] = [
		{
			view: LOGIN_VIEWS.ROOT,
			component: LoginOptions
		},
		{
			view: LOGIN_VIEWS.CREATE_ACCOUNT,
			component: CreateAccount
		},
		{
			view: LOGIN_VIEWS.NSEC,
			component: NsecLogin
		}
	];
