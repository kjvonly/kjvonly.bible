import {
	Modules,
	buildRequiredResourceSelections,
	type ModuleResourceSelectionBuildContext,
	type ModuleResourceSelectionContributor,
	type ResourceSelections
} from '$lib/application';

import { DICTIONARY_RESOURCE_TYPE } from './entries/dictionary-resource-contract';

/** Captures the selected Dictionary Resource for one navigation interaction. */
export class DictionaryModuleResourceSelectionContributor
	implements ModuleResourceSelectionContributor {
	readonly module = Modules.DICTIONARY;

	/** Preserve a related selection before falling back to the current selection. */
	build(context: ModuleResourceSelectionBuildContext): ResourceSelections {
		return buildRequiredResourceSelections([DICTIONARY_RESOURCE_TYPE], context);
	}
}
