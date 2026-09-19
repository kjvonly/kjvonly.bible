/**
 * Public application UI API.
 *
 * Browser-facing presentation code should consume shared application UI
 * components and DOM helpers through this boundary. Keeping these exports
 * separate prevents non-UI consumers of `$lib/application` from evaluating
 * Svelte/browser-only modules.
 */

import ArchiveExport from '../modules/archive/archiveExport.svelte';

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
	ArchiveExport
};

export {
	attachEvents,
	findElement,
	scrollTo,
	scrollToTop,
	type ScrollToViewFunction
} from './eventHandlers';
