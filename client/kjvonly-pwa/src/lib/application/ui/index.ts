/**
 * Public application UI API.
 *
 * Browser-facing presentation code should consume shared application UI
 * components and DOM helpers through this boundary. Keeping these exports
 * separate prevents non-UI consumers of `$lib/application` from evaluating
 * Svelte/browser-only modules.
 */

export {
	default as PaneContainer
} from '../runtime/pane/components/pane.svelte';

export {
	default as ViewBody
} from '../runtime/navigation/components/viewBody.svelte';

export {
	default as ViewHeader
} from '../runtime/navigation/components/viewHeader.svelte';

export {
	default as KJVBackButton
} from './navigation/KJVBackButton.svelte';

export {
	default as Settings
} from '../modules/settings/settings.svelte';

export {
	default as SearchView
} from './search/searchView.svelte';

export type { SearchAdapter } from './search/search-adapter';

export type {
	SearchViewResultSummary,
	SearchViewResultsContext,
	SearchViewState
} from './search/search-view.model';

export {
	attachEvents,
	findElement,
	scrollTo,
	scrollToTop,
	type ScrollToViewFunction
} from './eventHandlers';
