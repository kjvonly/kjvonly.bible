import {
	Modules,
	buildRequiredResourceSelections,
	type ModuleResourceSelectionBuildContext,
	type ModuleResourceSelectionContributor,
	type ResourceSelections
} from '$lib/application';
import { BIBLE_BOOKNAMES_RESOURCE_TYPE } from '$lib/domains/bible';

/** Bookmarks list uses the configured Bible Booknames Resource for labels. */
export class BookmarksModuleResourceSelectionContributor
implements ModuleResourceSelectionContributor {
	readonly module = Modules.BOOKMARKS;

	build(context: ModuleResourceSelectionBuildContext): ResourceSelections {
		return buildRequiredResourceSelections([BIBLE_BOOKNAMES_RESOURCE_TYPE], context);
	}
}
