import {
	getContext,
	setContext
} from 'svelte';

import type {
	FileManagerNavigationService
} from '../services/file-manager-navigation.service';

///////////////////////////////////////////////////////////////////////////////

const FILE_MANAGER_NAVIGATION_CONTEXT = Symbol(
	'kjvonly.file-manager-navigation-context'
);

///////////////////////////////////////////////////////////////////////////////

/** Provides navigation for one mounted FileManager module instance. */
export function provideFileManagerNavigationContext(
	service: FileManagerNavigationService
): void {
	setContext(
		FILE_MANAGER_NAVIGATION_CONTEXT,
		service
	);
}

/** Returns the nearest module-local FileManager navigation service. */
export function useFileManagerNavigationContext():
	FileManagerNavigationService {
	const service = getContext<
		FileManagerNavigationService |
		undefined
	>(
		FILE_MANAGER_NAVIGATION_CONTEXT
	);

	if (!service) {
		throw new Error(
			'FileManager navigation context is not available.'
		);
	}

	return service;
}
