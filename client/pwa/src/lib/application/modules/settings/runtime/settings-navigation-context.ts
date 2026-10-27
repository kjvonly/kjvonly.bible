import {
	getContext,
	setContext
} from 'svelte';

import type {
	SettingsNavigationService
} from '../services/settings-navigation.service';

///////////////////////////////////////////////////////////////////////////////

const SETTINGS_NAVIGATION_CONTEXT = Symbol(
	'kjvonly.settings-navigation-context'
);

///////////////////////////////////////////////////////////////////////////////

/** Provide navigation for one mounted Settings module instance. */
export function provideSettingsNavigationContext(
	service: SettingsNavigationService
): void {
	setContext(
		SETTINGS_NAVIGATION_CONTEXT,
		service
	);
}

/** Return the nearest module-local Settings navigation service. */
export function useSettingsNavigationContext(): SettingsNavigationService {
	const service = getContext<SettingsNavigationService | undefined>(
		SETTINGS_NAVIGATION_CONTEXT
	);

	if (!service) {
		throw new Error('Settings navigation context is not available.');
	}

	return service;
}
