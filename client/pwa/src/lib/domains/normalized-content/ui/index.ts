export {
	default as NormalizedContentRenderer
} from './components/normalizedContentRenderer.svelte';

export type {
	NormalizedContentLinkHandler
} from './models/normalized-content-link-handler';

export type {
	NormalizedContentWordActivationHandler
} from './models/normalized-content-word-activation-handler';

export {
	normalizedContentNavigationViewRegistrations
} from '../modules/runtime/normalized-content-navigation-view-registrations';

export {
	findNormalizedContentLocalTarget
} from './presentation/normalized-content-local-target';

export type {
	NormalizedContentDomAddress
} from './addressing/normalized-content-dom-address';

export {
	resolveNormalizedContentDomAddress
} from './addressing/normalized-content-dom-address';
