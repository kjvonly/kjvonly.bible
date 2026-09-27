import type {
	NavigationViewRegistration
} from '../../runtime/rendering/navigation-view-registry';

import {
	ARCHIVE_VIEWS,
	type ArchiveView
} from './archive-navigation.model';

import Archive from './archive.svelte';
import ArchiveExport from './archiveExport.svelte';
import ArchiveImport from './archiveImport.svelte';

/**
 * Archive-owned navigation views registered by the application composition root.
 */
export const archiveNavigationViewRegistrations:
	readonly NavigationViewRegistration<ArchiveView>[] = [
		{
			view: ARCHIVE_VIEWS.ROOT,
			component: Archive
		},
		{
			view: ARCHIVE_VIEWS.IMPORT,
			component: ArchiveImport
		},
		{
			view: ARCHIVE_VIEWS.EXPORT,
			component: ArchiveExport
		}
	];
