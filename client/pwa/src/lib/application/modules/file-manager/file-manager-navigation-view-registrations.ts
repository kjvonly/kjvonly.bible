import type {
	NavigationViewRegistration
} from '../../runtime/rendering/navigation-view-registry';

import FileManagerNavigationEntry from './fileManagerNavigationEntry.svelte';
import {
	FILE_MANAGER_VIEWS,
	type FileManagerView
} from './models/file-manager-navigation.model';

/** FileManager-owned navigation views registered by application composition. */
export const fileManagerNavigationViewRegistrations:
	readonly NavigationViewRegistration<FileManagerView>[] = [
		{
			view: FILE_MANAGER_VIEWS.ROOT,
			component: FileManagerNavigationEntry
		},
		{
			view: FILE_MANAGER_VIEWS.BROWSER,
			component: FileManagerNavigationEntry
		},
		{
			view: FILE_MANAGER_VIEWS.SEARCH,
			component: FileManagerNavigationEntry
		},
		{
			view: FILE_MANAGER_VIEWS.OVERFLOW_ACTIONS,
			component: FileManagerNavigationEntry
		}
	];
