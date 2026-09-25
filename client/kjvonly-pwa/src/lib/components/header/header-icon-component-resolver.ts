import ArrowBack from '../svgs/arrowBack.svelte';
import MoreVertical from '../svgs/moreVertical.svelte';

import type {
	HeaderIconID
} from './header-action.model';

///////////////////////////////////////////////////////////////////////////////

const HEADER_ICON_COMPONENTS = {
	'arrow-back': ArrowBack,
	'more-vertical': MoreVertical
} as const satisfies Record<HeaderIconID, unknown>;

///////////////////////////////////////////////////////////////////////////////

export function resolveHeaderIconComponent(
	iconID: HeaderIconID
) {
	return HEADER_ICON_COMPONENTS[iconID];
}
