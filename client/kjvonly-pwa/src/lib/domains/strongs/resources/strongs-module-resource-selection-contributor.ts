import { Modules, buildRequiredResourceSelections, type ModuleResourceSelectionBuildContext, type ModuleResourceSelectionContributor, type ResourceSelections } from '$lib/application';
import type { PublishedResourceReference } from '$lib/resource';
import { DICTIONARY_RESOURCE_TYPE, parseDictionaryResourceId } from '$lib/domains/dictionary';
import { BIBLE_CHAPTER_RESOURCE_TYPE, BIBLE_SEARCH_RESOURCE_TYPE, BIBLE_BOOKNAMES_RESOURCE_TYPE } from '$lib/domains/bible';

const CONTEXT_RESOURCE_TYPES = [
    BIBLE_CHAPTER_RESOURCE_TYPE,
    BIBLE_SEARCH_RESOURCE_TYPE,
    BIBLE_BOOKNAMES_RESOURCE_TYPE
] as const;

/** Strong's uses Dictionary entries but must not inherit a selected Webster edition. */
export class StrongsModuleResourceSelectionContributor implements ModuleResourceSelectionContributor {
    readonly module = Modules.STRONGS;

    constructor(private readonly defaultSource: PublishedResourceReference) {}

    build(context: ModuleResourceSelectionBuildContext): ResourceSelections {
        const selections = buildRequiredResourceSelections(CONTEXT_RESOURCE_TYPES, context);
        const originating = context.originatingSelections[DICTIONARY_RESOURCE_TYPE];
        let strongsSource = this.defaultSource;
        if (originating) {
            try {
                if (parseDictionaryResourceId(originating.resourceId).edition.startsWith('strongs-')) {
                    strongsSource = originating;
                }
            } catch {
                // An unrelated origin must not replace the configured Strong's edition.
            }
        }
        selections[DICTIONARY_RESOURCE_TYPE] = { ...strongsSource };
        return selections;
    }
}
