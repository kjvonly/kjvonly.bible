import type {
	PaneSplit
} from './pane-split';

import type {
	PaneState
} from './pane-state.model';

export interface Pane {
	id: string | undefined;
	left: Pane | undefined;
	right: Pane | undefined;
	split: PaneSplit | undefined;
	state: PaneState | undefined;
}
