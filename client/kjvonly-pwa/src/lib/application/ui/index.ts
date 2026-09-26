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
	default as BufferBody
} from '../runtime/buffer/components/bufferBody.svelte';

export {
	default as BufferContainer
} from '../runtime/buffer/components/bufferContainer.svelte';

export {
	default as BufferHeader
} from '../runtime/buffer/components/bufferHeader.svelte';

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
