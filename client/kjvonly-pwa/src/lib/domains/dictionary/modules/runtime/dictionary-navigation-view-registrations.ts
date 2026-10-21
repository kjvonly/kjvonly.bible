import type { NavigationViewRegistration } from '$lib/application';
import { DICTIONARY_VIEWS, type DictionaryView } from '../../models/dictionary-navigation.model';
import Dictionary from '../dictionary.svelte';
import DictionaryEntry from '../dictionaryEntry.svelte';
import DictionaryEditionView from '../dictionaryEditionView.svelte';
import DictionaryOverflowActionsView from '../dictionaryOverflowActionsView.svelte';

/** Browser-only Dictionary navigation contribution. */
export const dictionaryNavigationViewRegistrations:
    readonly NavigationViewRegistration<DictionaryView>[] = [
        { view: DICTIONARY_VIEWS.ROOT, component: Dictionary },
        { view: DICTIONARY_VIEWS.ENTRY, component: DictionaryEntry },
        { view: DICTIONARY_VIEWS.EDITION, component: DictionaryEditionView },
        { view: DICTIONARY_VIEWS.OVERFLOW_ACTIONS, component: DictionaryOverflowActionsView }
    ];
