/** Browser-only Dictionary presentation components. */
export { default as DictionarySearchResults } from './DictionarySearchResults.svelte';

export { dictionaryNavigationViewRegistrations } from '../modules/runtime/dictionary-navigation-view-registrations';

/** Browser runtime owns both Dictionary workers; never construct them in Svelte. */
export { DictionaryRuntime } from '../runtime/dictionary-runtime';
